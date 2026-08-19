-- ===========================================================================
-- Acres dMRV — 0011 · Project & transport emissions entries
-- Client request (slide 4): the GHG page pulls emissions from upstream data
-- instead of asking for them again. Emissions (vehicle transport, processing
-- energy, capture) are logged once here — by distance×weight×EF or fuel×EF —
-- and fn_batch_emissions sums them per batch for the quantification.
-- The emission factors come from the methodology module (Transport Table 4);
-- the entry stores the exact EF used so every number is auditable.
-- ===========================================================================

do $$ begin
  create type emission_kind as enum ('transport', 'processing', 'capture');
exception when duplicate_object then null; end $$;

do $$ begin
  create type emission_method as enum ('distance', 'fuel');
exception when duplicate_object then null; end $$;

create table if not exists emissions_entries (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references projects(id) on delete cascade,
  production_batch_id  uuid references production_batches(id) on delete cascade,
  feedstock_batch_id   uuid references feedstock_batches(id) on delete set null,
  kind                 emission_kind not null,
  method               emission_method not null default 'distance',
  description          text,
  -- distance method inputs
  distance_km          numeric(10,2),
  weight_t             numeric(10,3),
  -- fuel method inputs
  fuel_type            text,
  fuel_qty             numeric(12,3),
  -- the exact emission factor applied (kg CO2e per t·km, or per fuel unit)
  emission_factor      numeric(12,6) not null,
  -- computed CO2e; branches on the method, so it always matches the inputs
  co2e_kg numeric(14,3) generated always as (
    case when method = 'distance'
      then coalesce(distance_km, 0) * coalesce(weight_t, 0) * coalesce(emission_factor, 0)
      else coalesce(fuel_qty, 0) * coalesce(emission_factor, 0)
    end
  ) stored,
  occurred_at          timestamptz not null default now(),
  recorded_by          uuid references profiles(id) on delete set null,
  created_at           timestamptz not null default now()
);
create index if not exists idx_emissions_project on emissions_entries(project_id);
create index if not exists idx_emissions_batch on emissions_entries(production_batch_id);

-- --- RLS: members read; reviewers (carbon accounting) write ----------------
alter table emissions_entries enable row level security;
drop policy if exists em_select on emissions_entries;
create policy em_select on emissions_entries for select
  using (public.is_project_member(project_id) or public.is_registry_admin());
drop policy if exists em_write on emissions_entries;
create policy em_write on emissions_entries for all
  using (public.can_review(project_id)) with check (public.can_review(project_id));

-- --- Audit -----------------------------------------------------------------
drop trigger if exists trg_audit_emissions_entries on emissions_entries;
create trigger trg_audit_emissions_entries
  after insert or update or delete on emissions_entries
  for each row execute function public.fn_audit();

-- --- Aggregate emissions for a batch (tCO2e), for the GHG quantification ----
create or replace function public.fn_batch_emissions(p_batch uuid)
returns table(transport_tco2e numeric, processing_tco2e numeric,
              capture_tco2e numeric, total_tco2e numeric)
language sql stable set search_path = public as $$
  select
    round(coalesce(sum(co2e_kg) filter (where kind = 'transport'), 0) / 1000.0, 6),
    round(coalesce(sum(co2e_kg) filter (where kind = 'processing'), 0) / 1000.0, 6),
    round(coalesce(sum(co2e_kg) filter (where kind = 'capture'), 0) / 1000.0, 6),
    round(coalesce(sum(co2e_kg), 0) / 1000.0, 6)
  from emissions_entries
  where production_batch_id = p_batch;
$$;
