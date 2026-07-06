-- ===========================================================================
-- Acres dMRV — 0005 · Storage buckets & policies
-- Evidence buckets are public-read (transparency for verifiers & registry) and
-- authenticated-write. Uploads are namespaced by project/run in the app.
-- ===========================================================================

insert into storage.buckets (id, name, public)
values
  ('run-photos',           'run-photos',           true),
  ('end-use-proof',        'end-use-proof',        true),
  ('lab-reports',          'lab-reports',          true),
  ('verification-reports', 'verification-reports', true),
  ('site-audit-photos',    'site-audit-photos',    true),
  ('avatars',              'avatars',              true)
on conflict (id) do nothing;

-- Public read of evidence objects (CDN serves them; this covers API listing).
drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects for select
  using (bucket_id in (
    'run-photos','end-use-proof','lab-reports',
    'verification-reports','site-audit-photos','avatars'));

-- Authenticated users may upload evidence.
drop policy if exists storage_auth_insert on storage.objects;
create policy storage_auth_insert on storage.objects for insert to authenticated
  with check (bucket_id in (
    'run-photos','end-use-proof','lab-reports',
    'verification-reports','site-audit-photos','avatars'));

-- Authenticated users may update/replace their own uploads.
drop policy if exists storage_auth_update on storage.objects;
create policy storage_auth_update on storage.objects for update to authenticated
  using (bucket_id in (
    'run-photos','end-use-proof','lab-reports',
    'verification-reports','site-audit-photos','avatars'));

drop policy if exists storage_auth_delete on storage.objects;
create policy storage_auth_delete on storage.objects for delete to authenticated
  using (bucket_id in (
    'run-photos','end-use-proof','lab-reports',
    'verification-reports','site-audit-photos','avatars'));
