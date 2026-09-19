-- Yrityksen logo ja esittely (PDF-tarjoukset, julkinen profiili)

alter table public.contractor_profiles
  add column if not exists logo_storage_path text;

comment on column public.contractor_profiles.logo_storage_path is
  'Supabase Storage -polku (contractor-branding/{id}/logo.*). Näytetään PDF-tarjouksessa ja profiilissa.';

comment on column public.contractor_profiles.description is
  'Yrityksen esittelyteksti — PDF-tarjous, julkinen profiili.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contractor-branding',
  'contractor-branding',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "contractor_branding_storage: own insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'contractor-branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contractor_branding_storage: own update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'contractor-branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contractor_branding_storage: own delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'contractor-branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "contractor_branding_storage: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'contractor-branding');

create policy "contractor_branding_storage: public read"
  on storage.objects for select
  to anon
  using (bucket_id = 'contractor-branding');
