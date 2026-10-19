begin;
alter table public.shipments add column if not exists revenue_usd numeric check (revenue_usd >= 0);
alter table public.shipments add column if not exists additional_cost_usd numeric not null default 0 check (additional_cost_usd >= 0);
alter table public.shipments add column if not exists decision_plan_id uuid unique;
create table if not exists public.decision_plans (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  result jsonb not null check (jsonb_typeof(result->'input')='object' and jsonb_typeof(result->'alternatives')='array'),
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE')),
  shipment_id text unique references public.shipments(shipment_id) on delete restrict,
  activated_at timestamptz,
  check ((status='DRAFT' and shipment_id is null and activated_at is null) or (status='ACTIVE' and shipment_id is not null and activated_at is not null))
);
alter table public.decision_plans enable row level security;
revoke all on public.decision_plans from anon;
grant select,insert,update,delete on public.decision_plans to authenticated;
create policy decision_admin_read on public.decision_plans for select to authenticated using (exists(select 1 from public.cp_admins where user_id=auth.uid()));
create policy decision_admin_insert on public.decision_plans for insert to authenticated with check (created_by=auth.uid() and status='DRAFT' and exists(select 1 from public.cp_admins where user_id=auth.uid()));
create policy decision_admin_update on public.decision_plans for update to authenticated using (exists(select 1 from public.cp_admins where user_id=auth.uid())) with check (exists(select 1 from public.cp_admins where user_id=auth.uid()));
create policy decision_admin_delete on public.decision_plans for delete to authenticated using (status='DRAFT' and exists(select 1 from public.cp_admins where user_id=auth.uid()));
create index if not exists decision_plans_created_idx on public.decision_plans(created_at desc);

-- One transaction, locked plan, stable shipment identifier: safe to retry.
create or replace function public.activate_decision_plan(p_id uuid,p_destination text,p_vehicle text,p_revenue numeric,p_overhead numeric)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  p public.decision_plans%rowtype; d public.destinations%rowtype; u public.fleet%rowtype;
  s public.shipments%rowtype; a jsonb; selected_mode text; sid text;
  cargo_weight numeric; estimate numeric; lead_days numeric; origin text; distance numeric;
  freight_share numeric; fuel_share numeric; handling_share numeric; customs_share numeric; component_total numeric;
begin
  if auth.uid() is null or not exists(select 1 from public.cp_admins where user_id=auth.uid()) then raise exception 'Administrator sign-in required' using errcode='42501'; end if;
  select * into p from public.decision_plans where id=p_id for update;
  if not found then raise exception 'Plan not found'; end if;
  if p.status='ACTIVE' then
    select * into s from public.shipments where shipment_id=p.shipment_id;
    return to_jsonb(p)||jsonb_build_object('shipment',to_jsonb(s));
  end if;
  if p_revenue is null or p_overhead is null or p_revenue<0 or p_overhead<0 or p_revenue::text in ('NaN','Infinity','-Infinity') or p_overhead::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid price or additional cost'; end if;
  selected_mode=coalesce(p.result->>'selectedMode',p.result->>'recommended');
  select value into a from jsonb_array_elements(p.result->'alternatives') where value->>'mode'=selected_mode and value->>'available'='true' limit 1;
  if a is null then raise exception 'Selected plan has insufficient data'; end if;
  cargo_weight=(p.result->'input'->>'weight')::numeric; estimate=(a->>'cost')::numeric; lead_days=(a->>'days')::numeric;
  if cargo_weight is null or cargo_weight<=0 or estimate is null or estimate<0 or lead_days is null or lead_days<=0 then raise exception 'Invalid plan estimates'; end if;
  select * into d from public.destinations where name=p_destination and country=p.result->'input'->>'country';
  if not found then raise exception 'Destination does not match plan'; end if;
  select * into u from public.fleet where vehicle_id=p_vehicle and transport_mode=selected_mode and capacity_kg>=cargo_weight;
  if not found then raise exception 'Vehicle mode or capacity does not match plan'; end if;
  if not exists(select 1 from public.operators where operator_id=u.operator_id and transport_mode=selected_mode) then raise exception 'No suitable operator assigned'; end if;
  origin=case selected_mode when 'SEA' then 'Laem Chabang, Thailand' when 'AIR' then 'Suvarnabhumi, Thailand' else 'Bangkok, Thailand' end;
  sid='CP-DSS-'||upper(replace(p_id::text,'-',''));
  select coalesce(avg(distance_km_assumed),0),coalesce(avg(freight_cost_usd),0),coalesce(avg(fuel_cost_usd),0),coalesce(avg(handling_cost_usd),0),coalesce(avg(customs_cost_usd),0)
    into distance,freight_share,fuel_share,handling_share,customs_share from public.shipments where destination_location=d.name and transport_mode=selected_mode and shipment_status='DELIVERED';
  fuel_share=fuel_share*(1+coalesce((p.result->'input'->>'fuel')::numeric,0)/100);
  component_total=freight_share+fuel_share+handling_share+customs_share;
  if component_total<=0 then freight_share=1; component_total=1; end if;
  insert into public.shipments(shipment_id,booking_datetime_utc,origin_location,origin_country,destination_location,destination_country,destination_region,carrier_name,transport_mode,service_level,vehicle_id,operator_id,product_category,weight_kg,distance_km_assumed,planned_departure_utc,planned_delivery_utc,customs_clearance_hours,transport_cost_usd,freight_cost_usd,fuel_cost_usd,handling_cost_usd,customs_cost_usd,shipment_status,on_time_delivery,revenue_usd,additional_cost_usd,decision_plan_id)
  values(sid,now(),origin,'Thailand',d.name,d.country,d.region,'CP',selected_mode,case when p.result->'input'->>'service'='all' then 'STANDARD' else p.result->'input'->>'service' end,u.vehicle_id,u.operator_id,'General cargo',cargo_weight,distance,now(),now()+lead_days*interval '1 day',0,estimate,estimate*freight_share/component_total,estimate*fuel_share/component_total,estimate*handling_share/component_total,estimate*customs_share/component_total,'BOOKED','false',p_revenue,p_overhead,p_id) returning * into s;
  insert into public.events(event_id,shipment_id,event_sequence,event_type,event_datetime_utc,planned_event_datetime_utc,event_location,event_description)
  values('EV-'||sid,sid,1,'BOOKED',now(),now(),origin,'Created from approved DSS plan');
  update public.decision_plans set status='ACTIVE',shipment_id=sid,activated_at=now(),result=jsonb_set(jsonb_set(result,'{input,revenue}',to_jsonb(p_revenue)),'{input,overhead}',to_jsonb(p_overhead)) where id=p_id returning * into p;
  return to_jsonb(p)||jsonb_build_object('shipment',to_jsonb(s));
end $$;
revoke all on function public.activate_decision_plan(uuid,text,text,numeric,numeric) from public,anon;
grant execute on function public.activate_decision_plan(uuid,text,text,numeric,numeric) to authenticated;
commit;
