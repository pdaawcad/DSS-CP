-- CP Logistics: synthetic educational dataset. Execute schema before seed.
begin;
create table if not exists public.cp_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.cp_admins enable row level security;
revoke all on public.cp_admins from anon, authenticated;
grant select on public.cp_admins to authenticated;
drop policy if exists own_admin_membership on public.cp_admins;
create policy own_admin_membership on public.cp_admins for select to authenticated using (user_id = (select auth.uid()));
create table if not exists public.destinations (
  name text primary key,
  country text,
  label text,
  region text,
  code text,
  lat numeric,
  lon numeric
);
alter table public.destinations enable row level security;
grant select on public.destinations to anon, authenticated;
grant insert, update, delete on public.destinations to authenticated;
drop policy if exists dashboard_read on public.destinations;
create policy dashboard_read on public.destinations for select to anon, authenticated using (true);
drop policy if exists admin_insert on public.destinations;
create policy admin_insert on public.destinations for insert to authenticated with check (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
drop policy if exists admin_update on public.destinations;
create policy admin_update on public.destinations for update to authenticated using (exists (select 1 from public.cp_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
drop policy if exists admin_delete on public.destinations;
create policy admin_delete on public.destinations for delete to authenticated using (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
create table if not exists public.operators (
  operator_id text primary key,
  operator_name text,
  role text,
  transport_mode text,
  experience_years numeric
);
alter table public.operators enable row level security;
grant select on public.operators to anon, authenticated;
grant insert, update, delete on public.operators to authenticated;
drop policy if exists dashboard_read on public.operators;
create policy dashboard_read on public.operators for select to anon, authenticated using (true);
drop policy if exists admin_insert on public.operators;
create policy admin_insert on public.operators for insert to authenticated with check (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
drop policy if exists admin_update on public.operators;
create policy admin_update on public.operators for update to authenticated using (exists (select 1 from public.cp_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
drop policy if exists admin_delete on public.operators;
create policy admin_delete on public.operators for delete to authenticated using (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
create table if not exists public.fleet (
  vehicle_id text primary key,
  vehicle_name text,
  transport_mode text,
  capacity_kg numeric,
  operator_id text references public.operators(operator_id) on delete restrict,
  home_base text
);
alter table public.fleet enable row level security;
grant select on public.fleet to anon, authenticated;
grant insert, update, delete on public.fleet to authenticated;
drop policy if exists dashboard_read on public.fleet;
create policy dashboard_read on public.fleet for select to anon, authenticated using (true);
drop policy if exists admin_insert on public.fleet;
create policy admin_insert on public.fleet for insert to authenticated with check (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
drop policy if exists admin_update on public.fleet;
create policy admin_update on public.fleet for update to authenticated using (exists (select 1 from public.cp_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
drop policy if exists admin_delete on public.fleet;
create policy admin_delete on public.fleet for delete to authenticated using (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
create table if not exists public.shipments (
  shipment_id text primary key,
  booking_datetime_utc timestamptz,
  origin_location text,
  origin_country text,
  destination_location text references public.destinations(name) on delete restrict,
  destination_country text,
  destination_region text,
  carrier_name text,
  transport_mode text,
  service_level text,
  vehicle_id text references public.fleet(vehicle_id) on delete restrict,
  operator_id text references public.operators(operator_id) on delete restrict,
  product_category text,
  weight_kg numeric,
  distance_km_assumed numeric,
  planned_departure_utc timestamptz,
  actual_departure_utc timestamptz,
  planned_delivery_utc timestamptz,
  actual_delivery_utc timestamptz,
  customs_clearance_hours numeric,
  transport_cost_usd numeric,
  freight_cost_usd numeric,
  fuel_cost_usd numeric,
  handling_cost_usd numeric,
  customs_cost_usd numeric,
  shipment_status text,
  delay_reason text,
  on_time_delivery text
);
alter table public.shipments enable row level security;
grant select on public.shipments to anon, authenticated;
grant insert, update, delete on public.shipments to authenticated;
drop policy if exists dashboard_read on public.shipments;
create policy dashboard_read on public.shipments for select to anon, authenticated using (true);
drop policy if exists admin_insert on public.shipments;
create policy admin_insert on public.shipments for insert to authenticated with check (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
drop policy if exists admin_update on public.shipments;
create policy admin_update on public.shipments for update to authenticated using (exists (select 1 from public.cp_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
drop policy if exists admin_delete on public.shipments;
create policy admin_delete on public.shipments for delete to authenticated using (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
create table if not exists public.events (
  event_id text primary key,
  shipment_id text references public.shipments(shipment_id) on delete restrict,
  event_sequence numeric,
  event_type text,
  event_datetime_utc timestamptz,
  planned_event_datetime_utc timestamptz,
  event_location text,
  event_description text,
  delay_reason text
);
alter table public.events enable row level security;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
drop policy if exists dashboard_read on public.events;
create policy dashboard_read on public.events for select to anon, authenticated using (true);
drop policy if exists admin_insert on public.events;
create policy admin_insert on public.events for insert to authenticated with check (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
drop policy if exists admin_update on public.events;
create policy admin_update on public.events for update to authenticated using (exists (select 1 from public.cp_admins where user_id = (select auth.uid()))) with check (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
drop policy if exists admin_delete on public.events;
create policy admin_delete on public.events for delete to authenticated using (exists (select 1 from public.cp_admins where user_id = (select auth.uid())));
create index if not exists events_shipment_idx on public.events(shipment_id);
create index if not exists shipments_destination_idx on public.shipments(destination_location);
commit;