-- ===========================================================================
-- Acres dMRV — 0006 · QA hardening (client-readiness audit fixes)
-- Enforces methodology invariants at the DATABASE, not just the UI.
-- ===========================================================================

-- --- 1. Lock down the serial counter (was RLS-off → anon could read/write) ---
alter table rcc_serial_counters enable row level security;
-- Intentionally NO policies: only the SECURITY DEFINER issuance function (and
-- the service role) may touch it. anon/authenticated are fully denied.

-- --- 2. One active GHG quantification per batch (prevents double-count / re-issue)
-- Eligibility flag persisted with the quantification (H/C_org gate).
alter table ghg_quantifications
  add column if not exists eligible boolean not null default true;
create unique index if not exists uq_ghg_batch on ghg_quantifications(production_batch_id);

-- --- 3. Batch roll-up counts APPROVED runs only (unapproved mass must not
-- flow into meters or the quantification prefill) --------------------------
create or replace function public.recompute_batch(p_batch uuid)
returns void language sql security definer set search_path = public as $$
  update production_batches pb set
    total_biochar_dry_kg = coalesce(
      (select sum(biochar_dry_kg) from kiln_runs
       where production_batch_id = p_batch and status = 'approved'), 0),
    run_count = (select count(*) from kiln_runs where production_batch_id = p_batch)
  where pb.id = p_batch;
$$;

-- --- 4. Enforce the 6-month / 200-tonne cap AND open-only assignment -------
create or replace function public.fn_guard_batch_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare b production_batches%rowtype; v_tonnes numeric; v_age_months numeric;
begin
  if new.production_batch_id is not null
     and new.production_batch_id is distinct from old.production_batch_id then
    select * into b from production_batches where id = new.production_batch_id;
    if b.status <> 'open' then
      raise exception 'Batch % is %; kiln runs can only be added to an open batch.',
        b.code, b.status;
    end if;
    v_tonnes := b.total_biochar_dry_kg / 1000.0;
    v_age_months := extract(epoch from (now() - b.opened_at)) / 2629800.0;
    if v_tonnes >= 200 or v_age_months >= 6 then
      raise exception
        'Batch % has reached its validity limit (200 t / 6 months, whichever first) — close it before adding more runs.',
        b.code;
    end if;
  end if;
  return new;
end; $$;

-- --- 5. Verifier-safe batch verification (verifier lacks can_review, so the
-- old direct UPDATE silently no-oped). SECURITY DEFINER RPC, guarded. ------
create or replace function public.fn_verify_batch(p_verification uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v verifications%rowtype;
begin
  select * into v from verifications where id = p_verification;
  if not found then raise exception 'Verification not found'; end if;
  if v.verifier_id is distinct from auth.uid() and not public.is_super_admin() then
    raise exception 'Only the assigned verifier may finalise this verification.';
  end if;
  if v.status <> 'approved' then
    raise exception 'Batch can only be marked verified once the verification is approved.';
  end if;
  if v.production_batch_id is not null then
    update production_batches set status = 'verified' where id = v.production_batch_id;
  end if;
end; $$;

-- --- 6. Two-person control + registry-only guard inside issuance ----------
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

  -- Registry-only for authenticated callers (defence in depth: RPC execute is
  -- otherwise public). A null auth.uid() = trusted service-role context (seed).
  if auth.uid() is not null and not public.is_registry_admin() then
    raise exception 'Only a registry admin may issue credits.';
  end if;
  -- Two-person control: the approver must differ from the initiator.
  if v.approved_by is null or v.approved_by = v.initiated_by then
    raise exception 'Two-person control: issuance must be approved by a different registry admin than the initiator.';
  end if;

  if exists (select 1 from rcc_credits where issuance_id = p_issuance) then
    return 0;  -- already issued (idempotent)
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
    if i < v_buffer then v_holder := 'Rainbow Buffer Pool'; v_txn := 'buffer';
    else v_holder := v_project_name; v_txn := 'issue'; end if;

    insert into rcc_credits(issuance_id, project_id, serial_number, credit_type,
                            vintage, geography, status, current_holder)
      values (p_issuance, v.project_id, v_serial, v.credit_type, v.vintage, v.geography,
              (case when i < v_buffer then 'buffer' else 'issued' end)::credit_status, v_holder)
      returning id into v_credit_id;

    insert into credit_transactions(credit_id, issuance_id, project_id, txn_type, to_holder, actor_id)
      values (v_credit_id, p_issuance, v.project_id, v_txn, v_holder, v.approved_by);
  end loop;

  if v_buffer > 0 then
    -- Per-project running balance (was summing across all projects).
    select coalesce(sum(contribution_tco2e), 0) into v_balance
      from buffer_pool_ledger where project_id = v.project_id;
    insert into buffer_pool_ledger(project_id, issuance_id, contribution_tco2e, balance_after, reason)
      values (v.project_id, p_issuance, v_buffer, v_balance + v_buffer, 'issuance_contribution');
  end if;

  update rcc_issuances set status = 'issued', issued_at = now() where id = p_issuance;
  return v_total;
end; $$;

-- Registry-only guard on retirement too.
create or replace function public.fn_retire_credit(p_credit uuid, p_beneficiary text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v rcc_credits%rowtype;
begin
  if auth.uid() is not null and not public.is_registry_admin() then
    raise exception 'Only a registry admin may retire credits.';
  end if;
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

-- --- 7. Verifier is read-only on evidence: cannot author end-use records ---
drop policy if exists eu_insert on end_use_records;
create policy eu_insert on end_use_records for insert
  with check (public.has_project_role(project_id,
    array['project_developer','kiln_supervisor','kiln_operator']::project_role[]));

-- --- 8. Re-roll batch totals under the new approved-only rule --------------
do $$ declare r record; begin
  for r in select id from production_batches loop
    perform public.recompute_batch(r.id);
  end loop;
end $$;
