-- project_photos RLS (aja 20260520100000_project_photos.sql ja 20260520120000 jälkeen)

do $$
begin
  if not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'project_photos'
  ) then
    raise exception 'project_photos-taulu puuttuu. Aja ensin migraatio 20260520100000_project_photos.sql';
  end if;
end $$;

drop policy if exists "project_photos: customer read own" on public.project_photos;
create policy "project_photos: customer read own"
  on public.project_photos for select
  using (public.customer_owns_project(project_id));

drop policy if exists "project_photos: customer insert own" on public.project_photos;
create policy "project_photos: customer insert own"
  on public.project_photos for insert
  with check (public.customer_owns_project(project_id));

drop policy if exists "project_photos: contractor read" on public.project_photos;
create policy "project_photos: contractor read"
  on public.project_photos for select
  using (public.contractor_can_read_project(project_id));
