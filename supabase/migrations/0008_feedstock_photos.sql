-- ===========================================================================
-- Acres dMRV — 0008 · Geo-tagged feedstock-delivery photos
-- Client request (slide 6): attach GPS-tagged photos to a feedstock delivery.
-- Evidence rows are immutable; project_id is denormalised from the parent
-- delivery so RLS and the audit trail can scope without a per-row join.
-- ===========================================================================

create table if not exists feedstock_photos (
  id                  uuid primary key default gen_random_uuid(),
  feedstock_batch_id  uuid not null references feedstock_batches(id) on delete cascade,
  project_id          uuid not null references projects(id) on delete cascade,
  storage_path        text not null,
  caption             text,
  latitude            numeric(9,6),
  longitude           numeric(9,6),
  taken_at            timestamptz,
  uploaded_by         uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_feedstock_photos_batch on feedstock_photos(feedstock_batch_id);
-- FK-backing index (project_id is used by RLS and the delete cascade).
create index if not exists idx_feedstock_photos_project on feedstock_photos(project_id);

-- --- RLS: project members read; members who can record deliveries write -----
alter table feedstock_photos enable row level security;

drop policy if exists fp_select on feedstock_photos;
create policy fp_select on feedstock_photos for select
  using (public.is_project_member(project_id) or public.is_registry_admin());

-- Insert mirrors the delivery insert policy: a site-assigned operator or a
-- reviewer (developer/supervisor) may attach evidence to a delivery.
drop policy if exists fp_insert on feedstock_photos;
create policy fp_insert on feedstock_photos for insert
  with check (exists (
    select 1 from feedstock_batches fb
    where fb.id = feedstock_batch_id
      and fb.project_id = feedstock_photos.project_id
      and (public.is_site_assigned(fb.site_id) or public.can_review(fb.project_id))));

drop policy if exists fp_delete on feedstock_photos;
create policy fp_delete on feedstock_photos for delete
  using (public.can_review(project_id));

-- --- Immutable audit trail (0003's loop is a fixed list; attach explicitly) --
drop trigger if exists trg_audit_feedstock_photos on feedstock_photos;
create trigger trg_audit_feedstock_photos
  after insert or update or delete on feedstock_photos
  for each row execute function public.fn_audit();

-- --- Storage bucket + dedicated policies (leaves 0005's policies untouched) --
insert into storage.buckets (id, name, public)
values ('feedstock-photos', 'feedstock-photos', true)
on conflict (id) do nothing;

drop policy if exists storage_public_read_feedstock on storage.objects;
create policy storage_public_read_feedstock on storage.objects for select
  using (bucket_id = 'feedstock-photos');

drop policy if exists storage_auth_insert_feedstock on storage.objects;
create policy storage_auth_insert_feedstock on storage.objects for insert to authenticated
  with check (bucket_id = 'feedstock-photos');

drop policy if exists storage_auth_update_feedstock on storage.objects;
create policy storage_auth_update_feedstock on storage.objects for update to authenticated
  using (bucket_id = 'feedstock-photos');

drop policy if exists storage_auth_delete_feedstock on storage.objects;
create policy storage_auth_delete_feedstock on storage.objects for delete to authenticated
  using (bucket_id = 'feedstock-photos');
