-- ===========================================================================
-- Acres dMRV — 0009 · Sensor ingestion pipeline (temperature & telemetry)
-- Client request (slide 1): temperature comes from sensors, not manual entry.
--
-- This builds the full pipe end-to-end; the only thing left to connect is the
-- physical device. A field device authenticates with a secret key (only its
-- SHA-256 hash is stored), posts readings to /api/sensors/ingest, and the run
-- screen reads the aggregated curve. No values are fabricated — an unfed kiln
-- simply has no readings, and the UI says so.
-- ===========================================================================

do $$ begin
  create type sensor_reading_type as enum ('temperature', 'moisture', 'mass', 'other');
exception when duplicate_object then null; end $$;

-- --- Registered ingestion devices (secret key stored only as a hash) --------
create table if not exists ingest_devices (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  site_id      uuid references sites(id) on delete set null,
  kiln_id      uuid references kilns(id) on delete set null,
  label        text not null,
  key_hash     text not null,          -- sha-256 hex of the device secret
  key_prefix   text not null,          -- first chars, shown in UI for identification
  active       boolean not null default true,
  last_seen_at timestamptz,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create unique index if not exists uq_ingest_devices_keyhash on ingest_devices(key_hash);
create index if not exists idx_ingest_devices_project on ingest_devices(project_id);
create index if not exists idx_ingest_devices_kiln on ingest_devices(kiln_id);

-- --- Raw sensor readings ----------------------------------------------------
create table if not exists sensor_readings (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  site_id      uuid references sites(id) on delete set null,
  kiln_id      uuid references kilns(id) on delete set null,
  kiln_run_id  uuid references kiln_runs(id) on delete set null,
  device_id    uuid references ingest_devices(id) on delete set null,
  reading_type sensor_reading_type not null,
  value        numeric not null,
  unit         text,
  recorded_at  timestamptz not null,
  ingested_at  timestamptz not null default now(),
  metadata     jsonb not null default '{}'
);
-- Composite index backs the temperature-window aggregation below.
create index if not exists idx_sensor_kiln_type_time
  on sensor_readings(kiln_id, reading_type, recorded_at);
create index if not exists idx_sensor_project on sensor_readings(project_id);
create index if not exists idx_sensor_run on sensor_readings(kiln_run_id);
create index if not exists idx_sensor_device on sensor_readings(device_id);

-- --- RLS --------------------------------------------------------------------
alter table ingest_devices enable row level security;
-- Reviewers manage devices; the key_hash is never selected by the app.
drop policy if exists dev_select on ingest_devices;
create policy dev_select on ingest_devices for select
  using (public.can_review(project_id) or public.is_registry_admin());
drop policy if exists dev_write on ingest_devices;
create policy dev_write on ingest_devices for all
  using (public.can_review(project_id)) with check (public.can_review(project_id));

alter table sensor_readings enable row level security;
-- Project members (incl. verifiers) and registry may read telemetry.
drop policy if exists sr_select on sensor_readings;
create policy sr_select on sensor_readings for select
  using (public.is_project_member(project_id) or public.is_registry_admin());
-- No authenticated write policy: readings are written only by the ingestion
-- function (service role), never by browser clients.

-- --- Audit (0003's loop is a fixed list; attach explicitly) -----------------
drop trigger if exists trg_audit_ingest_devices on ingest_devices;
create trigger trg_audit_ingest_devices
  after insert or update or delete on ingest_devices
  for each row execute function public.fn_audit();

-- --- Atomic ingestion: validate key hash → insert reading → touch device ----
-- Called only by the server ingestion route holding the service role. The
-- device's secret key is the credential; we compare its hash (computed in the
-- route, so pgcrypto's schema is irrelevant here).
create or replace function public.fn_ingest_sensor_reading(
  p_key_hash     text,
  p_reading_type sensor_reading_type,
  p_value        numeric,
  p_unit         text,
  p_recorded_at  timestamptz,
  p_kiln_id      uuid default null,
  p_metadata     jsonb default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d ingest_devices%rowtype;
  v_kiln uuid;
  v_site uuid;
  v_reading uuid;
begin
  select * into d from ingest_devices where key_hash = p_key_hash and active;
  if not found then
    raise exception 'Unknown or inactive device key' using errcode = '28000';
  end if;

  v_kiln := coalesce(p_kiln_id, d.kiln_id);
  -- Resolve the site from the kiln when possible, else the device's site.
  select site_id into v_site from kilns where id = v_kiln;
  v_site := coalesce(v_site, d.site_id);

  insert into sensor_readings(project_id, site_id, kiln_id, device_id,
                              reading_type, value, unit, recorded_at, metadata)
    values (d.project_id, v_site, v_kiln, d.id,
            p_reading_type, p_value, p_unit, coalesce(p_recorded_at, now()),
            coalesce(p_metadata, '{}'::jsonb))
    returning id into v_reading;

  update ingest_devices set last_seen_at = now() where id = d.id;
  return v_reading;
end; $$;

-- Only the service role (server ingestion route) may call it.
revoke all on function public.fn_ingest_sensor_reading(text, sensor_reading_type, numeric, text, timestamptz, uuid, jsonb) from public, anon, authenticated;

-- --- Read path: aggregate a kiln's temperature over a run window ------------
-- Invoker rights, so sensor_readings RLS applies. Empty window → null peak,
-- empty curve, zero samples (never invented data).
create or replace function public.fn_run_temperature(
  p_kiln uuid, p_start timestamptz, p_end timestamptz
) returns table(peak_temp_c numeric, curve jsonb, sample_count int)
language sql stable set search_path = public as $$
  select
    max(value) as peak_temp_c,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          't', round(extract(epoch from (recorded_at - p_start)) / 60.0)::int,
          'temp', round(value)::numeric
        ) order by recorded_at
      ),
      '[]'::jsonb
    ) as curve,
    count(*)::int as sample_count
  from sensor_readings
  where kiln_id = p_kiln
    and reading_type = 'temperature'
    and recorded_at between p_start and p_end;
$$;
