-- ===========================================================================
-- Rainbow dMRV — 0004 · Row Level Security
-- Enforces separation of duties: producers (operators) are separated from
-- reviewers/reporters (supervisors, developers, verifiers) at the database.
-- ===========================================================================

-- Enable RLS everywhere.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','projects','project_members','sites','site_assignments','kilns',
    'approved_feedstocks','feedstock_batches','production_batches','kiln_runs',
    'run_photos','composite_samples','lab_tests','ghg_quantifications',
    'end_use_records','verifications','verification_findings','rcc_issuances',
    'rcc_credits','buffer_pool_ledger','credit_transactions','site_audits',
    'notifications','audit_log'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- --- profiles ---------------------------------------------------------------
drop policy if exists prof_select on profiles;
create policy prof_select on profiles for select using (true);  -- names visible to team
drop policy if exists prof_update on profiles;
create policy prof_update on profiles for update
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());
drop policy if exists prof_insert on profiles;
create policy prof_insert on profiles for insert
  with check (id = auth.uid() or public.is_super_admin());

-- --- projects ---------------------------------------------------------------
drop policy if exists proj_select on projects;
create policy proj_select on projects for select
  using (public.is_project_member(id) or public.is_registry_admin());
drop policy if exists proj_insert on projects;
create policy proj_insert on projects for insert
  with check (developer_id = auth.uid() or public.is_super_admin());
drop policy if exists proj_update on projects;
create policy proj_update on projects for update
  using (public.has_project_role(id, array['project_developer']::project_role[]))
  with check (public.has_project_role(id, array['project_developer']::project_role[]));

-- --- project_members --------------------------------------------------------
drop policy if exists pm_select on project_members;
create policy pm_select on project_members for select
  using (public.is_project_member(project_id) or public.is_registry_admin());
drop policy if exists pm_write on project_members;
create policy pm_write on project_members for all
  using (public.has_project_role(project_id, array['project_developer']::project_role[]))
  with check (public.has_project_role(project_id, array['project_developer']::project_role[]));

-- --- sites ------------------------------------------------------------------
drop policy if exists site_select on sites;
create policy site_select on sites for select
  using (public.is_project_member(project_id) or public.is_registry_admin());
drop policy if exists site_write on sites;
create policy site_write on sites for all
  using (public.can_review(project_id))
  with check (public.can_review(project_id));

-- --- site_assignments -------------------------------------------------------
drop policy if exists sa_select on site_assignments;
create policy sa_select on site_assignments for select
  using (exists (select 1 from sites s where s.id = site_id and public.is_project_member(s.project_id)));
drop policy if exists sa_write on site_assignments;
create policy sa_write on site_assignments for all
  using (exists (select 1 from sites s where s.id = site_id and public.can_review(s.project_id)))
  with check (exists (select 1 from sites s where s.id = site_id and public.can_review(s.project_id)));

-- --- kilns ------------------------------------------------------------------
drop policy if exists kiln_select on kilns;
create policy kiln_select on kilns for select
  using (public.is_project_member(project_id) or public.is_registry_admin());
drop policy if exists kiln_write on kilns;
create policy kiln_write on kilns for all
  using (public.can_review(project_id))
  with check (public.can_review(project_id));

-- --- approved_feedstocks ----------------------------------------------------
drop policy if exists af_select on approved_feedstocks;
create policy af_select on approved_feedstocks for select
  using (public.is_project_member(project_id));
drop policy if exists af_write on approved_feedstocks;
create policy af_write on approved_feedstocks for all
  using (public.can_review(project_id))
  with check (public.can_review(project_id));

-- --- feedstock_batches ------------------------------------------------------
drop policy if exists fb_select on feedstock_batches;
create policy fb_select on feedstock_batches for select
  using (public.is_project_member(project_id));
drop policy if exists fb_insert on feedstock_batches;
create policy fb_insert on feedstock_batches for insert
  with check (public.is_site_assigned(site_id) or public.can_review(project_id));
drop policy if exists fb_update on feedstock_batches;
create policy fb_update on feedstock_batches for update
  using (public.can_review(project_id))
  with check (public.can_review(project_id));
drop policy if exists fb_delete on feedstock_batches;
create policy fb_delete on feedstock_batches for delete
  using (public.can_review(project_id));

-- --- production_batches -----------------------------------------------------
drop policy if exists pb_select on production_batches;
create policy pb_select on production_batches for select
  using (public.is_project_member(project_id) or public.is_registry_admin());
drop policy if exists pb_write on production_batches;
create policy pb_write on production_batches for all
  using (public.can_review(project_id))
  with check (public.can_review(project_id));

-- --- kiln_runs --------------------------------------------------------------
-- Operators see only their assigned sites; reviewers & verifiers see the project.
drop policy if exists run_select on kiln_runs;
create policy run_select on kiln_runs for select
  using (
    public.is_site_assigned(site_id)
    or public.has_project_role(project_id, array['verifier']::project_role[])
    or public.is_registry_admin()
  );
drop policy if exists run_insert on kiln_runs;
create policy run_insert on kiln_runs for insert
  with check (public.is_site_assigned(site_id));
-- Operators may edit their own runs only until approved; reviewers may always edit.
drop policy if exists run_update on kiln_runs;
create policy run_update on kiln_runs for update
  using (
    public.can_review(project_id)
    or (operator_id = auth.uid() and status in ('draft','submitted','changes_requested'))
  )
  with check (
    public.can_review(project_id)
    or (operator_id = auth.uid() and status in ('draft','submitted','changes_requested'))
  );
drop policy if exists run_delete on kiln_runs;
create policy run_delete on kiln_runs for delete
  using (public.can_review(project_id)
    or (operator_id = auth.uid() and status = 'draft'));

-- --- run_photos -------------------------------------------------------------
drop policy if exists rp_select on run_photos;
create policy rp_select on run_photos for select
  using (exists (
    select 1 from kiln_runs r where r.id = kiln_run_id
    and (public.is_site_assigned(r.site_id)
      or public.has_project_role(r.project_id, array['verifier']::project_role[])
      or public.is_registry_admin())));
drop policy if exists rp_write on run_photos;
create policy rp_write on run_photos for all
  using (exists (
    select 1 from kiln_runs r where r.id = kiln_run_id
    and (public.is_site_assigned(r.site_id) or public.can_review(r.project_id))))
  with check (exists (
    select 1 from kiln_runs r where r.id = kiln_run_id
    and (public.is_site_assigned(r.site_id) or public.can_review(r.project_id))));

-- --- composite_samples ------------------------------------------------------
drop policy if exists cs_select on composite_samples;
create policy cs_select on composite_samples for select
  using (exists (select 1 from production_batches b where b.id = production_batch_id
    and public.is_project_member(b.project_id)));
drop policy if exists cs_write on composite_samples;
create policy cs_write on composite_samples for all
  using (exists (select 1 from production_batches b where b.id = production_batch_id
    and (public.is_site_assigned(composite_samples.site_id) or public.can_review(b.project_id))))
  with check (exists (select 1 from production_batches b where b.id = production_batch_id
    and (public.is_site_assigned(composite_samples.site_id) or public.can_review(b.project_id))));

-- --- lab_tests --------------------------------------------------------------
drop policy if exists lab_select on lab_tests;
create policy lab_select on lab_tests for select
  using (exists (select 1 from production_batches b where b.id = production_batch_id
    and (public.is_project_member(b.project_id) or public.is_registry_admin())));
drop policy if exists lab_write on lab_tests;
create policy lab_write on lab_tests for all
  using (exists (select 1 from production_batches b where b.id = production_batch_id
    and public.can_review(b.project_id)))
  with check (exists (select 1 from production_batches b where b.id = production_batch_id
    and public.can_review(b.project_id)));

-- --- ghg_quantifications ----------------------------------------------------
drop policy if exists ghg_select on ghg_quantifications;
create policy ghg_select on ghg_quantifications for select
  using (exists (select 1 from production_batches b where b.id = production_batch_id
    and (public.is_project_member(b.project_id) or public.is_registry_admin())));
drop policy if exists ghg_write on ghg_quantifications;
create policy ghg_write on ghg_quantifications for all
  using (exists (select 1 from production_batches b where b.id = production_batch_id
    and public.can_review(b.project_id)))
  with check (exists (select 1 from production_batches b where b.id = production_batch_id
    and public.can_review(b.project_id)));

-- --- end_use_records --------------------------------------------------------
drop policy if exists eu_select on end_use_records;
create policy eu_select on end_use_records for select
  using (public.is_project_member(project_id) or public.is_registry_admin());
drop policy if exists eu_insert on end_use_records;
create policy eu_insert on end_use_records for insert
  with check (public.is_project_member(project_id));
drop policy if exists eu_update on end_use_records;
create policy eu_update on end_use_records for update
  using (public.can_review(project_id)) with check (public.can_review(project_id));

-- --- verifications ----------------------------------------------------------
drop policy if exists ver_select on verifications;
create policy ver_select on verifications for select
  using (public.is_project_member(project_id) or verifier_id = auth.uid()
    or public.is_registry_admin());
drop policy if exists ver_insert on verifications;
create policy ver_insert on verifications for insert
  with check (public.can_review(project_id));
drop policy if exists ver_update on verifications;
create policy ver_update on verifications for update
  using (verifier_id = auth.uid() or public.is_super_admin())
  with check (verifier_id = auth.uid() or public.is_super_admin());

-- --- verification_findings --------------------------------------------------
drop policy if exists vf_select on verification_findings;
create policy vf_select on verification_findings for select
  using (exists (select 1 from verifications v where v.id = verification_id
    and (public.is_project_member(v.project_id) or v.verifier_id = auth.uid()
      or public.is_registry_admin())));
drop policy if exists vf_write on verification_findings;
create policy vf_write on verification_findings for all
  using (exists (select 1 from verifications v where v.id = verification_id
    and (v.verifier_id = auth.uid() or public.is_super_admin())))
  with check (exists (select 1 from verifications v where v.id = verification_id
    and (v.verifier_id = auth.uid() or public.is_super_admin())));

-- --- rcc_issuances ----------------------------------------------------------
drop policy if exists iss_select on rcc_issuances;
create policy iss_select on rcc_issuances for select
  using (public.is_project_member(project_id) or public.is_registry_admin());
drop policy if exists iss_write on rcc_issuances;
create policy iss_write on rcc_issuances for all
  using (public.is_registry_admin()) with check (public.is_registry_admin());

-- --- rcc_credits (public registry transparency) ----------------------------
drop policy if exists cred_select on rcc_credits;
create policy cred_select on rcc_credits for select using (true);
drop policy if exists cred_write on rcc_credits;
create policy cred_write on rcc_credits for all
  using (public.is_registry_admin()) with check (public.is_registry_admin());

-- --- buffer_pool_ledger (public) -------------------------------------------
drop policy if exists buf_select on buffer_pool_ledger;
create policy buf_select on buffer_pool_ledger for select using (true);
drop policy if exists buf_write on buffer_pool_ledger;
create policy buf_write on buffer_pool_ledger for all
  using (public.is_registry_admin()) with check (public.is_registry_admin());

-- --- credit_transactions (public ledger) -----------------------------------
drop policy if exists ct_select on credit_transactions;
create policy ct_select on credit_transactions for select using (true);
drop policy if exists ct_write on credit_transactions;
create policy ct_write on credit_transactions for all
  using (public.is_registry_admin()) with check (public.is_registry_admin());

-- --- site_audits ------------------------------------------------------------
drop policy if exists au_select on site_audits;
create policy au_select on site_audits for select
  using (public.is_project_member(project_id));
drop policy if exists au_write on site_audits;
create policy au_write on site_audits for all
  using (public.has_project_role(project_id,
    array['kiln_supervisor','project_developer']::project_role[]))
  with check (public.has_project_role(project_id,
    array['kiln_supervisor','project_developer']::project_role[]));

-- --- notifications ----------------------------------------------------------
drop policy if exists notif_select on notifications;
create policy notif_select on notifications for select using (user_id = auth.uid());
drop policy if exists notif_update on notifications;
create policy notif_update on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notif_insert on notifications;
create policy notif_insert on notifications for insert with check (user_id = auth.uid());

-- --- audit_log (read-only to project members; writes only via trigger) -----
drop policy if exists audit_select on audit_log;
create policy audit_select on audit_log for select
  using (public.is_super_admin() or public.is_registry_admin()
    or (project_id is not null and public.is_project_member(project_id)));
