-- Tarjouspyynnön muokkaus: urakoitsijan tarjous vanhenee kunnes päivitetään

alter table public.projects
  add column if not exists content_revision int not null default 1;

alter table public.bids
  add column if not exists confirmed_content_revision int;

comment on column public.projects.content_revision is 'Kasvaa kun asiakas muokkaa pyyntöä tarjousten jälkeen';
comment on column public.bids.confirmed_content_revision is 'Projektin content_revision tarjouksen viimeisimmän vahvistuksen yhteydessä';

update public.bids
set confirmed_content_revision = 1
where status = 'submitted'
  and confirmed_content_revision is null;

drop policy if exists "project_contacts: customer update own" on public.project_contacts;
create policy "project_contacts: customer update own"
  on public.project_contacts for update
  using (public.customer_owns_project(project_id))
  with check (public.customer_owns_project(project_id));
