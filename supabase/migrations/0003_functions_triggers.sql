-- ===========================================================================
-- Rainbow dMRV — 0003 · Functions & triggers
--   RBAC helpers · new-user profile · updated_at · audit trail
--   batch roll-up & guards · RCC serial generation & issuance · buffer pool
-- ===========================================================================

-- --- RBAC helper functions (SECURITY DEFINER to avoid RLS recursion) --------
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and global_role = 'super_admin'
  );
$$;

create or replace function public.is_registry_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid()
      and global_role in ('registry_admin', 'super_admin')
  );
$$;

create or replace function public.is_project_member(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1 from project_members
    where project_id = p_project and user_id = auth.uid()
  );
$$;

create or replace function public.has_project_role(p_project uuid, p_roles project_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1 from project_members
    where project_id = p_project and user_id = auth.uid() and role = any(p_roles)
  );
$$;

-- Reviewers: developer or supervisor (or super admin) — the QA / reporting side.
create or replace function public.can_review(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_project_role(p_project,
    array['project_developer','kiln_supervisor']::project_role[]);
$$;

create or replace function public.is_site_assigned(p_site uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1 from site_assignments where site_id = p_site and user_id = auth.uid()
  ) or exists (
    -- developers/supervisors implicitly cover all sites in their project
    select 1 from sites s
    where s.id = p_site and public.can_review(s.project_id)
  );
$$;

-- --- New auth user → profile ------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, global_role, organization)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'global_role')::global_role, 'member'),
    new.raw_user_meta_data->>'organization'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- updated_at -------------------------------------------------------------
create or replace function public.fn_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_touch_profiles on profiles;
create trigger trg_touch_profiles before update on profiles
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_touch_projects on projects;
create trigger trg_touch_projects before update on projects
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_touch_runs on kiln_runs;
create trigger trg_touch_runs before update on kiln_runs
  for each row execute function public.fn_touch_updated_at();

-- --- Immutable audit trail --------------------------------------------------
create or replace function public.fn_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb;
  v_after  jsonb;
  v_action audit_action;
  v_record text;
  v_project uuid;
begin
  if (tg_op = 'DELETE') then
    v_before := to_jsonb(old); v_after := null; v_action := 'delete';
    v_record := v_before->>'id';
  elsif (tg_op = 'UPDATE') then
    v_before := to_jsonb(old); v_after := to_jsonb(new); v_action := 'update';
    v_record := v_after->>'id';
  else
    v_before := null; v_after := to_jsonb(new); v_action := 'insert';
    v_record := v_after->>'id';
  end if;

  if tg_table_name = 'projects' then
    v_project := coalesce(v_after->>'id', v_before->>'id')::uuid;
  else
    v_project := nullif(coalesce(v_after->>'project_id', v_before->>'project_id'), '')::uuid;
  end if;

  insert into audit_log(table_name, record_id, action, actor_id, project_id, before, after)
  values (tg_table_name, v_record, v_action, auth.uid(), v_project, v_before, v_after);

  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;

-- Attach the audit trigger to all substantive mutation tables.
do $$
declare t text;
begin
  foreach t in array array[
    'projects','project_members','sites','site_assignments','kilns',
    'approved_feedstocks','feedstock_batches','production_batches','kiln_runs',
    'run_photos','composite_samples','lab_tests','ghg_quantifications',
    'end_use_records','verifications','verification_findings','rcc_issuances',
    'rcc_credits','buffer_pool_ledger','credit_transactions','site_audits'
  ]
  loop
    execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on %1$s
       for each row execute function public.fn_audit();', t);
  end loop;
end $$;

-- --- Production-batch roll-up & guard --------------------------------------
create or replace function public.recompute_batch(p_batch uuid)
returns void language sql security definer set search_path = public as $$
  update production_batches pb set
    total_biochar_dry_kg = coalesce(
      (select sum(biochar_dry_kg) from kiln_runs where production_batch_id = p_batch), 0),
    run_count = (select count(*) from kiln_runs where production_batch_id = p_batch)
  where pb.id = p_batch;
$$;

create or replace function public.fn_batch_rollup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT','UPDATE') and new.production_batch_id is not null then
    perform public.recompute_batch(new.production_batch_id);
  end if;
  if tg_op = 'UPDATE' and old.production_batch_id is distinct from new.production_batch_id
     and old.production_batch_id is not null then
    perform public.recompute_batch(old.production_batch_id);
  end if;
  if tg_op = 'DELETE' and old.production_batch_id is not null then
    perform public.recompute_batch(old.production_batch_id);
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;

drop trigger if exists trg_batch_rollup on kiln_runs;
create trigger trg_batch_rollup
  after insert or update or delete on kiln_runs
  for each row execute function public.fn_batch_rollup();

-- Soft guard: cannot assign a run to an already-verified batch.
create or replace function public.fn_guard_batch_assignment()
returns trigger language plpgsql as $$
declare v_status batch_status;
begin
  if new.production_batch_id is not null then
    select status into v_status from production_batches where id = new.production_batch_id;
    if v_status = 'verified' then
      raise exception 'Cannot add a kiln run to a verified production batch (%).', new.production_batch_id;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_batch on kiln_runs;
create trigger trg_guard_batch
  before insert or update on kiln_runs
  for each row execute function public.fn_guard_batch_assignment();

-- --- Batch usage helper (for UI meters / limit checks) ---------------------
create or replace function public.batch_usage(p_batch uuid)
returns table (
  tonnes numeric, tonnes_pct numeric, age_months numeric, months_pct numeric, over_limit boolean
)
language sql stable security definer set search_path = public as $$
  select
    round(pb.total_biochar_dry_kg / 1000.0, 3) as tonnes,
    round((pb.total_biochar_dry_kg / 1000.0) / 200.0 * 100, 1) as tonnes_pct,
    round(extract(epoch from (coalesce(pb.closed_at, now()) - pb.opened_at)) / 2629800.0, 2) as age_months,
    round(extract(epoch from (coalesce(pb.closed_at, now()) - pb.opened_at)) / 2629800.0 / 6.0 * 100, 1) as months_pct,
    (pb.total_biochar_dry_kg / 1000.0 >= 200.0
     or extract(epoch from (coalesce(pb.closed_at, now()) - pb.opened_at)) / 2629800.0 >= 6.0) as over_limit
  from production_batches pb where pb.id = p_batch;
$$;

-- --- RCC serial counters & issuance ----------------------------------------
create table if not exists rcc_serial_counters (
  project_id  uuid not null references projects(id) on delete cascade,
  credit_type credit_type not null,
  vintage     int not null,
  last_seq    int not null default 0,
  primary key (project_id, credit_type, vintage)
);

-- Issue whole-credit RCC rows for an approved issuance (idempotent).
-- Allocates the first buffer_tco2e credits to the Rainbow Buffer Pool.
create or replace function public.fn_issue_credits(p_issuance uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v          rcc_issuances%rowtype;
  v_code     text;
  v_project_name text;
  v_total    int;
  v_buffer   int;
  v_start    int;
  i          int;
  v_serial   text;
  v_credit_id uuid;
  v_holder   text;
  v_txn      text;
  v_balance  numeric;
begin
  select * into v from rcc_issuances where id = p_issuance;
  if not found then raise exception 'Issuance % not found', p_issuance; end if;
  if exists (select 1 from rcc_credits where issuance_id = p_issuance) then
    return 0;  -- already issued
  end if;

  select code, name into v_code, v_project_name from projects where id = v.project_id;
  v_total  := floor(v.gross_tco2e)::int;
  v_buffer := floor(v.buffer_tco2e)::int;
  if v_total <= 0 then return 0; end if;

  insert into rcc_serial_counters(project_id, credit_type, vintage, last_seq)
    values (v.project_id, v.credit_type, v.vintage, v_total)
    on conflict (project_id, credit_type, vintage)
    do update set last_seq = rcc_serial_counters.last_seq + v_total
    returning last_seq - v_total + 1 into v_start;

  for i in 0 .. v_total - 1 loop
    v_serial := 'RCC-BIO-' || v.geography || '-' || v_code || '-' || v.vintage || '-' ||
                (case when v.credit_type = 'removal' then 'RMV' else 'AVD' end) || '-' ||
                lpad((v_start + i)::text, 6, '0');
    if i < v_buffer then
      v_holder := 'Rainbow Buffer Pool'; v_txn := 'buffer';
    else
      v_holder := v_project_name; v_txn := 'issue';
    end if;

    insert into rcc_credits(issuance_id, project_id, serial_number, credit_type,
                            vintage, geography, status, current_holder)
      values (p_issuance, v.project_id, v_serial, v.credit_type, v.vintage, v.geography,
              (case when i < v_buffer then 'buffer' else 'issued' end)::credit_status, v_holder)
      returning id into v_credit_id;

    insert into credit_transactions(credit_id, issuance_id, project_id, txn_type, to_holder, actor_id)
      values (v_credit_id, p_issuance, v.project_id, v_txn, v_holder, v.approved_by);
  end loop;

  if v_buffer > 0 then
    select coalesce(sum(contribution_tco2e), 0) into v_balance from buffer_pool_ledger;
    insert into buffer_pool_ledger(project_id, issuance_id, contribution_tco2e, balance_after, reason)
      values (v.project_id, p_issuance, v_buffer, v_balance + v_buffer, 'issuance_contribution');
  end if;

  update rcc_issuances set status = 'issued', issued_at = now() where id = p_issuance;
  return v_total;
end; $$;

-- Retire a single credit (locks it to a beneficiary).
create or replace function public.fn_retire_credit(p_credit uuid, p_beneficiary text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v rcc_credits%rowtype;
begin
  select * into v from rcc_credits where id = p_credit;
  if not found then raise exception 'Credit not found'; end if;
  if v.status = 'retired' then raise exception 'Credit already retired'; end if;
  update rcc_credits set status = 'retired', current_holder = p_beneficiary,
    retired_reason = p_reason, retired_at = now() where id = p_credit;
  insert into credit_transactions(credit_id, issuance_id, project_id, txn_type,
                                  from_holder, to_holder, notes, actor_id)
    values (p_credit, v.issuance_id, v.project_id, 'retire', v.current_holder,
            p_beneficiary, p_reason, auth.uid());
end; $$;
