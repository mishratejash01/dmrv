-- ===========================================================================
-- Acres dMRV — 0001 · Extensions & enumerated domain types
-- ===========================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";         -- case-insensitive emails

-- --- Roles ------------------------------------------------------------------
-- Global roles live on the profile; project roles are scoped per membership.
do $$ begin
  create type global_role as enum ('super_admin', 'registry_admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_role as enum (
    'project_developer', 'kiln_supervisor', 'kiln_operator', 'verifier'
  );
exception when duplicate_object then null; end $$;

-- --- Status enums -----------------------------------------------------------
do $$ begin
  create type project_status as enum ('draft', 'active', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type site_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kiln_type as enum (
    'flame_curtain_cone', 'flame_curtain_trench', 'flame_curtain_shielded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type kiln_status as enum ('active', 'maintenance', 'retired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedstock_category as enum (
    'forest_secondary', 'forest_managed', 'tree_removal',
    'ag_residue_valued', 'ag_residue_no_value', 'other_waste', 'invasive_species'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type run_status as enum (
    'draft', 'submitted', 'approved', 'rejected', 'changes_requested'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type photo_type as enum ('pyrolysis', 'flame_curtain', 'quench', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type batch_status as enum ('open', 'closed', 'testing', 'verified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type durability_pathway as enum ('years_100', 'years_1000');
exception when duplicate_object then null; end $$;

do $$ begin
  create type credit_type as enum ('removal', 'avoidance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type credit_status as enum (
    'issued', 'verified', 'retired', 'cancelled', 'buffer', 'transferred'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum (
    'assigned', 'in_review', 'approved', 'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type finding_severity as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type finding_status as enum ('open', 'resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type issuance_status as enum ('draft', 'initiated', 'approved', 'issued');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum (
    'review_request', 'batch_limit', 'verification_status', 'issuance', 'end_use', 'info'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_action as enum ('insert', 'update', 'delete', 'approve', 'reject');
exception when duplicate_object then null; end $$;
