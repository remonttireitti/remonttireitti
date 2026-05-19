-- Erotetaan asiakkaan projektikäytännöt: INSERT vaatii eksplisiittisen WITH CHECK -ehdon.

drop policy if exists "projects: customer CRUD own" on public.projects;

create policy "projects: customer select own"
  on public.projects for select
  using (auth.uid() = customer_id);

create policy "projects: customer insert own"
  on public.projects for insert
  with check (auth.uid() = customer_id);

create policy "projects: customer update own"
  on public.projects for update
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

create policy "projects: customer delete own"
  on public.projects for delete
  using (auth.uid() = customer_id);
