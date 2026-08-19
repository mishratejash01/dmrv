-- ===========================================================================
-- Acres dMRV — 0010 · Measurement provenance + biochar reverse-calculation
-- Client request (slide 2): biochar mass comes from computer vision or a
-- reverse-calculation — not manual entry.
--
-- Reverse-calculation is legitimate methodology math (dry biochar =
-- dry feedstock × char-yield). We make the yield editable config per kiln and
-- record, on every run, WHERE each figure came from so a verifier can audit it.
-- The computer-vision path is a separate source value the /api/vision route
-- fills in once a model is connected. Nothing is hardcoded: the yield is
-- project config, and provenance is tracked explicitly.
-- ===========================================================================

do $$ begin
  create type measurement_source as enum ('manual', 'reverse_calc', 'computer_vision', 'sensor');
exception when duplicate_object then null; end $$;

-- --- Provenance on each run -------------------------------------------------
alter table kiln_runs
  add column if not exists temp_source    measurement_source not null default 'manual',
  add column if not exists biochar_source measurement_source not null default 'manual';

-- --- Editable reverse-calc config on the kiln ------------------------------
-- char_yield_pct: dry biochar as a % of dry feedstock mass. ~20% is a
-- representative flame-curtain / Kon-Tiki default; developers tune it per kiln.
-- default_moisture_pct: fresh-biochar moisture used to derive wet mass when no
-- sensor/manual reading is available.
alter table kilns
  add column if not exists char_yield_pct      numeric(5,2) not null default 20.00,
  add column if not exists default_moisture_pct numeric(5,2) not null default 12.00;

-- Backfill any pre-existing kilns to the same defaults (idempotent).
update kilns set char_yield_pct = 20.00 where char_yield_pct is null;
update kilns set default_moisture_pct = 12.00 where default_moisture_pct is null;

-- --- Canonical reverse-calculation -----------------------------------------
-- Single source of truth for the estimate, so the field client and any
-- server-side recompute/verification agree to the gram.
--   dry biochar = dry feedstock × yield%
--   wet biochar = dry / (1 − moisture%)      (so the generated dry column matches)
create or replace function public.fn_estimate_biochar(
  p_feedstock_dry_kg numeric,
  p_yield_pct        numeric,
  p_moisture_pct     numeric default 12.0
) returns table(dry_kg numeric, wet_kg numeric)
language sql immutable as $$
  select
    round(dry, 2) as dry_kg,
    round(case when p_moisture_pct > 0 and p_moisture_pct < 100
               then dry / (1 - p_moisture_pct / 100.0) else dry end, 2) as wet_kg
  from (select coalesce(p_feedstock_dry_kg, 0) * coalesce(p_yield_pct, 0) / 100.0 as dry) s;
$$;
