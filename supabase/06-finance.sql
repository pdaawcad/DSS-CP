-- Additive educational finance module. No operational records are overwritten.
begin;
create table if not exists public.finance_dataset (id text primary key, meta jsonb not null);
create table if not exists public.finance_trips (
 id text primary key, month text not null check(month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
 mode text not null check(mode in ('ROAD','SEA','AIR')), asset text not null,
 destination text not null, capacity_kg numeric not null check(capacity_kg>0),
 load_kg numeric not null check(load_kg>=0 and load_kg<=capacity_kg),
 fuel_thb numeric not null check(fuel_thb>=0), handling_thb numeric not null check(handling_thb>=0), other_thb numeric not null check(other_thb>=0)
);
create table if not exists public.finance_jobs (
 id text primary key, trip_id text not null references public.finance_trips(id), customer text not null,
 delivered_on date not null, weight_kg numeric not null check(weight_kg>0),
 revenue_usd numeric not null check(revenue_usd>=0), fx_rate numeric not null check(fx_rate>0),
 revenue_thb numeric not null check(revenue_thb>=0), on_time boolean not null
);
create table if not exists public.finance_expenses (
 id text primary key, month text not null check(month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'), asset text,
 category text not null, amount_thb numeric not null check(amount_thb>=0)
);
create table if not exists public.finance_cashflows (
 id text primary key,date date not null,direction text not null check(direction in ('IN','OUT')),
 amount_thb numeric not null check(amount_thb>=0),reference text not null, category text not null
);
create table if not exists public.finance_plans (
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 120),
 created_at timestamptz not null default now(), created_by uuid not null default auth.uid() references auth.users(id),
 status text not null default 'DRAFT' check(status in ('DRAFT','APPROVED')),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'), approved_at timestamptz, approved_by uuid references auth.users(id),
 check((status='DRAFT' and approved_at is null and approved_by is null) or (status='APPROVED' and approved_at is not null and approved_by is not null))
);
create table if not exists public.finance_actuals (
 month text primary key check(month between '2026-10' and '2027-09'),
 revenue_thb numeric not null check(revenue_thb>=0),direct_thb numeric not null check(direct_thb>=0),fixed_thb numeric not null check(fixed_thb>=0),overhead_thb numeric not null check(overhead_thb>=0),
 cash_in_thb numeric not null check(cash_in_thb>=0),cash_out_thb numeric not null check(cash_out_thb>=0),
 on_time_pct numeric not null check(on_time_pct between 0 and 100), load_pct numeric not null check(load_pct between 0 and 100),
 closed boolean not null default false, note text not null default '', updated_at timestamptz not null default now(),updated_by uuid not null default auth.uid() references auth.users(id)
);
do $$ declare t text; begin
 foreach t in array array['finance_dataset','finance_trips','finance_jobs','finance_expenses','finance_cashflows','finance_plans','finance_actuals'] loop
 execute format('alter table public.%I enable row level security',t);
 if t in ('finance_plans','finance_actuals') then
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 else
 execute format('grant select on public.%I to anon,authenticated',t);
 execute format('grant insert,update,delete on public.%I to authenticated',t);
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='finance_read') then
 if t in ('finance_plans','finance_actuals') then
 execute format('create policy finance_read on public.%I for select to authenticated using (exists(select 1 from public.cp_admins where user_id=auth.uid()))',t);
 else
 execute format('create policy finance_read on public.%I for select to anon,authenticated using(true)',t);
 end if;
 execute format('create policy finance_write on public.%I for all to authenticated using(exists(select 1 from public.cp_admins where user_id=auth.uid())) with check(exists(select 1 from public.cp_admins where user_id=auth.uid()))',t);
 end if;
 end loop;
end $$;
create or replace function public.finance_guard_plan() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP in ('UPDATE','DELETE') and OLD.status='APPROVED' then raise exception 'Approved plans are immutable; create a new version'; end if;
 if TG_OP='DELETE' then return OLD; end if;
 if TG_OP='INSERT' then NEW.created_by=auth.uid(); NEW.created_at=now(); end if;
 if NEW.status='APPROVED' then
   if coalesce((NEW.snapshot->'scenario'->>'feasible')::boolean,false)=false then raise exception 'Scenario violates constraints'; end if;
   NEW.approved_by=auth.uid(); NEW.approved_at=now();
 end if;
 return NEW;
end $$;
create or replace trigger finance_plan_guard before insert or update or delete on public.finance_plans for each row execute function public.finance_guard_plan();
create or replace function public.finance_guard_actual() returns trigger language plpgsql set search_path=public as $$
begin
 if NEW.month>to_char(now() at time zone 'Asia/Bangkok','YYYY-MM') then raise exception 'Cannot record future actuals'; end if;
 if NEW.closed and NEW.month>=to_char(now() at time zone 'Asia/Bangkok','YYYY-MM') then raise exception 'Month has not ended'; end if;
 NEW.updated_at=now(); NEW.updated_by=auth.uid(); return NEW;
end $$;
create or replace trigger finance_actual_guard before insert or update on public.finance_actuals for each row execute function public.finance_guard_actual();
commit;
