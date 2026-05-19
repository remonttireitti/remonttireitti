-- Korjaa: infinite recursion detected in policy for relation "contractor_profiles"
-- Syy: contractor_profiles-politiikka lukee projects-taulua, projects-politiikka lukee contractor_profiles-taulua.

create or replace function public.is_contractor_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.contractor_profiles
    where id = auth.uid()
  );
$$;

create or replace function public.customer_can_read_contractor_profile(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bids b
    join public.projects p on p.id = b.project_id
    where b.contractor_id = target_id
      and p.customer_id = auth.uid()
  );
$$;

create or replace function public.customer_can_read_profile_on_bid(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bids b
    join public.projects p on p.id = b.project_id
    where b.contractor_id = target_id
      and p.customer_id = auth.uid()
  );
$$;

grant execute on function public.is_contractor_user() to authenticated;
grant execute on function public.customer_can_read_contractor_profile(uuid) to authenticated;
grant execute on function public.customer_can_read_profile_on_bid(uuid) to authenticated;

drop policy if exists "projects: contractors read published" on public.projects;
create policy "projects: contractors read published"
  on public.projects
  for select
  using (
    status in ('published', 'receiving_bids', 'bid_accepted', 'in_progress', 'completed')
    and public.is_contractor_user()
  );

drop policy if exists "contractors: customer read bidders on own project" on public.contractor_profiles;
create policy "contractors: customer read bidders on own project"
  on public.contractor_profiles
  for select
  using (public.customer_can_read_contractor_profile(id));

drop policy if exists "profiles: customer read bidders on own project" on public.profiles;
create policy "profiles: customer read bidders on own project"
  on public.profiles
  for select
  using (public.customer_can_read_profile_on_bid(id));
