-- ===========================================================================
-- Acres dMRV — 0002 · Core schema (full traceability chain)
-- Project → Site → Kiln → Kiln Run → Composite Sample → Production Batch
--   → Lab Test → GHG Quantification → Verification → RCC Issuance → Credits
-- ===========================================================================

-- --- Profiles (extends auth.users) -----------------------------------------
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         citext not null,
  full_name     text not null default 'New user',
  phone         text,
  avatar_url    text,
  organization  text,
  global_role   global_role not null default 'member',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- --- Projects ---------------------------------------------------------------
create table if not exists projects (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  code                    text not null unique,          -- e.g. P001 (used in serials)
  developer_id            uuid references profiles(id) on delete set null,
  methodology             text not null default 'RBW-BCR-DOB-V1.0',
  pdd_reference           text,
  country_code            char(2) not null default 'IN', -- ISO geography
  region                  text,
  crediting_period_start  date,
  crediting_period_end    date,
  monitoring_period_months int not null default 12,
  buffer_pool_pct         numeric(5,2) not null default 2.00,
  durability_pathway      durability_pathway not null default 'years_100',
  soil_temp_c             numeric(4,1) not null default 18.0,  -- selects permanence coeffs
  description             text,
  status                  project_status not null default 'draft',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- --- Project membership (project-scoped RBAC) ------------------------------
create table if not exists project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  role        project_role not null,
  created_at  timestamptz not null default now(),
  unique (project_id, user_id, role)
);
create index if not exists idx_project_members_user on project_members(user_id);
create index if not exists idx_project_members_project on project_members(project_id);

-- --- Sites ------------------------------------------------------------------
create table if not exists sites (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects(id) on delete cascade,
  name                  text not null,
  code                  text not null,
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  address               text,
  region                text,
  supply_envelope       text,           -- feedstock source-area description / area
  previous_cropping     text,
  status                site_status not null default 'active',
  created_at            timestamptz not null default now(),
  unique (project_id, code)
);
create index if not exists idx_sites_project on sites(project_id);

-- Operators / supervisors assigned to specific sites
create table if not exists site_assignments (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (site_id, user_id)
);
create index if not exists idx_site_assignments_user on site_assignments(user_id);

-- --- Kilns ------------------------------------------------------------------
create table if not exists kilns (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references sites(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  name            text not null,
  code            text not null,
  kiln_type       kiln_type not null default 'flame_curtain_cone',
  capacity_kg     numeric(10,2),
  sop_reference   text,
  specifications  jsonb not null default '{}',
  status          kiln_status not null default 'active',
  created_at      timestamptz not null default now(),
  unique (site_id, code)
);
create index if not exists idx_kilns_site on kilns(site_id);

-- --- Approved feedstock list (per project) ---------------------------------
create table if not exists approved_feedstocks (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects(id) on delete cascade,
  name                  text not null,
  category              feedstock_category not null,
  carbon_fraction       numeric(5,4) not null default 0.45,  -- t C / t dry matter
  forestry_certification text,        -- FSC/PEFC/RSB/SFI/SBP where applicable
  proof_method          text,         -- price / contextual / positive_list
  notes                 text,
  active                boolean not null default true,
  created_at            timestamptz not null default now()
);
create index if not exists idx_approved_feedstocks_project on approved_feedstocks(project_id);

-- --- Feedstock batches (deliveries) ----------------------------------------
create table if not exists feedstock_batches (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references projects(id) on delete cascade,
  site_id                 uuid references sites(id) on delete set null,
  approved_feedstock_id   uuid references approved_feedstocks(id) on delete set null,
  source                  text not null,
  category                feedstock_category not null,
  weight_kg               numeric(12,2) not null,
  moisture_pct            numeric(5,2) not null default 0,
  dry_weight_kg           numeric(12,2) generated always as
                            (weight_kg * (1 - moisture_pct/100.0)) stored,
  source_area_description text,
  received_at             timestamptz not null default now(),
  recorded_by             uuid references profiles(id) on delete set null,
  created_at              timestamptz not null default now()
);
create index if not exists idx_feedstock_project on feedstock_batches(project_id);
create index if not exists idx_feedstock_site on feedstock_batches(site_id);

-- --- Production batches (created before runs are grouped into them) ---------
create table if not exists production_batches (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references projects(id) on delete cascade,
  code                    text not null,
  kiln_type               kiln_type not null,
  feedstock_category      feedstock_category,
  temperature_profile     text,
  opened_at               timestamptz not null default now(),
  closed_at               timestamptz,
  status                  batch_status not null default 'open',
  total_biochar_dry_kg    numeric(14,2) not null default 0,  -- maintained by trigger
  run_count               int not null default 0,            -- maintained by trigger
  notes                   text,
  created_at              timestamptz not null default now(),
  unique (project_id, code)
);
create index if not exists idx_batches_project on production_batches(project_id);

-- --- Kiln runs (the atomic operational record) -----------------------------
create table if not exists kiln_runs (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references projects(id) on delete cascade,
  site_id                 uuid not null references sites(id) on delete cascade,
  kiln_id                 uuid not null references kilns(id) on delete cascade,
  operator_id             uuid references profiles(id) on delete set null,
  feedstock_batch_id      uuid references feedstock_batches(id) on delete set null,
  production_batch_id     uuid references production_batches(id) on delete set null,
  code                    text,
  started_at              timestamptz,
  ended_at                timestamptz,
  peak_temp_c             numeric(6,1),
  temperature_curve       jsonb not null default '[]',  -- [{t: minutes, temp: c}]
  latitude                numeric(9,6),
  longitude               numeric(9,6),
  biochar_wet_kg          numeric(10,2),
  biochar_moisture_pct    numeric(5,2),
  biochar_dry_kg          numeric(10,2) generated always as
                            (case when biochar_wet_kg is not null and biochar_moisture_pct is not null
                             then biochar_wet_kg * (1 - biochar_moisture_pct/100.0) else null end) stored,
  composite_sample_kg     numeric(8,2),
  quench_method           text,
  quenched_at             timestamptz,
  notes                   text,
  anomaly_flag            boolean not null default false,
  status                  run_status not null default 'draft',
  review_notes            text,
  reviewed_by             uuid references profiles(id) on delete set null,
  reviewed_at             timestamptz,
  submitted_at            timestamptz,
  client_ref              text,   -- offline client-generated id for idempotent sync
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists idx_runs_project on kiln_runs(project_id);
create index if not exists idx_runs_site on kiln_runs(site_id);
create index if not exists idx_runs_batch on kiln_runs(production_batch_id);
create index if not exists idx_runs_operator on kiln_runs(operator_id);
create index if not exists idx_runs_status on kiln_runs(status);
create unique index if not exists uq_runs_client_ref on kiln_runs(operator_id, client_ref)
  where client_ref is not null;

-- --- Run photos (required evidence) ----------------------------------------
create table if not exists run_photos (
  id            uuid primary key default gen_random_uuid(),
  kiln_run_id   uuid not null references kiln_runs(id) on delete cascade,
  photo_type    photo_type not null,
  storage_path  text not null,
  latitude      numeric(9,6),
  longitude     numeric(9,6),
  taken_at      timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_run_photos_run on run_photos(kiln_run_id);

-- --- Composite samples (site pile contributions) ---------------------------
create table if not exists composite_samples (
  id                    uuid primary key default gen_random_uuid(),
  production_batch_id   uuid not null references production_batches(id) on delete cascade,
  site_id               uuid references sites(id) on delete set null,
  kiln_run_id           uuid references kiln_runs(id) on delete set null,
  mass_kg               numeric(8,2) not null,
  stage                 text not null default 'site_pile',  -- site_pile / site_sample / batch_sample
  collected_at          timestamptz not null default now(),
  created_at            timestamptz not null default now()
);
create index if not exists idx_composite_batch on composite_samples(production_batch_id);

-- --- Lab tests (accredited lab, per batch) ---------------------------------
create table if not exists lab_tests (
  id                        uuid primary key default gen_random_uuid(),
  production_batch_id       uuid not null references production_batches(id) on delete cascade,
  lab_name                  text not null,
  accreditation             text,          -- e.g. ISO/IEC 17025
  sample_id                 text,
  organic_carbon_pct        numeric(5,2) not null,
  hydrogen_carbon_molar_ratio numeric(5,3) not null,  -- H/C_org (eligibility < 0.7)
  ash_content_pct           numeric(5,2),
  moisture_pct              numeric(5,2),
  ph                        numeric(4,2),
  inertinite_pct            numeric(5,2),
  random_reflectance_pct    numeric(5,2),   -- for 1000-yr pathway
  pollutants_ok             boolean,
  stability_notes           text,
  report_path               text,
  tested_at                 date,
  recorded_by               uuid references profiles(id) on delete set null,
  created_at                timestamptz not null default now()
);
create index if not exists idx_lab_batch on lab_tests(production_batch_id);

-- --- GHG quantification (per batch) ----------------------------------------
create table if not exists ghg_quantifications (
  id                        uuid primary key default gen_random_uuid(),
  production_batch_id       uuid not null references production_batches(id) on delete cascade,
  lab_test_id               uuid references lab_tests(id) on delete set null,
  credit_type               credit_type not null default 'removal',
  durability_years          int not null default 100,
  functional_unit           text not null default '1 tonne of biochar applied',
  biochar_fresh_t           numeric(12,3) not null,
  moisture_fraction         numeric(6,4) not null,
  dry_t                     numeric(12,3) not null,
  organic_carbon_fraction   numeric(6,4) not null,
  hc_org_ratio              numeric(5,3) not null,
  soil_temp_c               numeric(4,1) not null,
  permanence_fraction       numeric(6,4) not null,
  gross_removal_tco2e       numeric(12,3) not null,
  baseline_removal_tco2e    numeric(12,3) not null default 0,
  project_emissions_tco2e   numeric(12,3) not null default 0,
  transport_emissions_tco2e numeric(12,3) not null default 0,
  uncertainty_tier          text not null default 'low',
  uncertainty_discount      numeric(5,3) not null default 0.03,
  net_before_discount_tco2e numeric(12,3) not null,
  net_co2_removed_tco2e     numeric(12,3) not null,
  breakdown                 jsonb not null default '[]',   -- full transparent line items
  computed_by               uuid references profiles(id) on delete set null,
  computed_at               timestamptz not null default now(),
  created_at                timestamptz not null default now()
);
create index if not exists idx_ghg_batch on ghg_quantifications(production_batch_id);

-- --- End-use records (carbon locking) --------------------------------------
create table if not exists end_use_records (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects(id) on delete cascade,
  production_batch_id   uuid references production_batches(id) on delete set null,
  quantity_kg           numeric(12,2) not null,
  application_method    text not null,       -- soil / compost / ...
  recipient_name        text,
  recipient_contact     text,
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  applied_at            timestamptz not null default now(),
  proof_paths           jsonb not null default '[]',  -- storage paths for proof photos
  notes                 text,
  recorded_by           uuid references profiles(id) on delete set null,
  created_at            timestamptz not null default now()
);
create index if not exists idx_enduse_project on end_use_records(project_id);
create index if not exists idx_enduse_batch on end_use_records(production_batch_id);

-- --- Verifications (VVB audits) --------------------------------------------
create table if not exists verifications (
  id                        uuid primary key default gen_random_uuid(),
  project_id                uuid not null references projects(id) on delete cascade,
  production_batch_id       uuid references production_batches(id) on delete set null,
  verifier_id               uuid references profiles(id) on delete set null,
  monitoring_period_start   date,
  monitoring_period_end     date,
  status                    verification_status not null default 'assigned',
  audit_type                text not null default 'remote',  -- remote / in_person
  summary                   text,
  report_path               text,
  decided_at                timestamptz,
  created_by                uuid references profiles(id) on delete set null,
  created_at                timestamptz not null default now()
);
create index if not exists idx_verif_project on verifications(project_id);
create index if not exists idx_verif_verifier on verifications(verifier_id);

create table if not exists verification_findings (
  id                uuid primary key default gen_random_uuid(),
  verification_id   uuid not null references verifications(id) on delete cascade,
  category          text not null,
  severity          finding_severity not null default 'low',
  description       text not null,
  related_entity    text,
  status            finding_status not null default 'open',
  created_by        uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_findings_verif on verification_findings(verification_id);

-- --- RCC issuances (post-verification) -------------------------------------
create table if not exists rcc_issuances (
  id                        uuid primary key default gen_random_uuid(),
  project_id                uuid not null references projects(id) on delete cascade,
  verification_id           uuid references verifications(id) on delete set null,
  production_batch_id       uuid references production_batches(id) on delete set null,
  ghg_quantification_id     uuid references ghg_quantifications(id) on delete set null,
  credit_type               credit_type not null default 'removal',
  vintage                   int not null,
  geography                 char(2) not null,
  gross_tco2e               numeric(12,2) not null,     -- whole-credit floor of net
  buffer_tco2e              numeric(12,2) not null default 0,
  net_issued_tco2e          numeric(12,2) not null,
  serial_prefix             text,                        -- e.g. RCC-BIO-IN-P001-2026-RMV
  status                    issuance_status not null default 'draft',
  initiated_by              uuid references profiles(id) on delete set null,
  approved_by               uuid references profiles(id) on delete set null,  -- two-person control
  issued_at                 timestamptz,
  created_at                timestamptz not null default now()
);
create index if not exists idx_issuance_project on rcc_issuances(project_id);

-- --- RCC credits (one row per tCO₂e credit unit) ---------------------------
create table if not exists rcc_credits (
  id              uuid primary key default gen_random_uuid(),
  issuance_id     uuid not null references rcc_issuances(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  serial_number   text not null unique,
  credit_type     credit_type not null,
  vintage         int not null,
  geography       char(2) not null,
  status          credit_status not null default 'issued',
  current_holder  text,
  retired_reason  text,
  retired_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_credits_issuance on rcc_credits(issuance_id);
create index if not exists idx_credits_status on rcc_credits(status);

-- --- Buffer pool ledger -----------------------------------------------------
create table if not exists buffer_pool_ledger (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete set null,
  issuance_id     uuid references rcc_issuances(id) on delete set null,
  contribution_tco2e numeric(12,2) not null,
  balance_after   numeric(14,2) not null,
  reason          text not null default 'issuance_contribution',
  created_at      timestamptz not null default now()
);

-- --- Credit lifecycle transactions -----------------------------------------
create table if not exists credit_transactions (
  id            uuid primary key default gen_random_uuid(),
  credit_id     uuid references rcc_credits(id) on delete cascade,
  issuance_id   uuid references rcc_issuances(id) on delete set null,
  project_id    uuid references projects(id) on delete set null,
  txn_type      text not null,   -- issue / transfer / retire / cancel / buffer
  from_holder   text,
  to_holder     text,
  tco2e         numeric(12,2) not null default 1,
  notes         text,
  actor_id      uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_txn_credit on credit_transactions(credit_id);
create index if not exists idx_txn_project on credit_transactions(project_id);

-- --- Site audits / supervisor visits ---------------------------------------
create table if not exists site_audits (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references sites(id) on delete cascade,
  project_id    uuid not null references projects(id) on delete cascade,
  supervisor_id uuid references profiles(id) on delete set null,
  visit_date    date not null default current_date,
  findings      text,
  photos        jsonb not null default '[]',
  created_at    timestamptz not null default now()
);
create index if not exists idx_site_audits_site on site_audits(site_id);

-- --- Notifications ----------------------------------------------------------
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  project_id  uuid references projects(id) on delete cascade,
  type        notification_type not null default 'info',
  title       text not null,
  body        text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id, read);

-- --- Audit log (immutable) --------------------------------------------------
create table if not exists audit_log (
  id            bigint generated always as identity primary key,
  table_name    text not null,
  record_id     text,
  action        audit_action not null,
  actor_id      uuid,
  project_id    uuid,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_audit_table on audit_log(table_name, record_id);
create index if not exists idx_audit_project on audit_log(project_id);
create index if not exists idx_audit_created on audit_log(created_at desc);
