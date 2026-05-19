-- Korjaa: infinite recursion detected in policy for relation "projects"
-- Syy: projects SELECT -politiikka lukee bids-taulua, bids-politiikka lukee projects-taulua.

create or replace function public.customer_owns_project(project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.customer_id = auth.uid()
  );
$$;

create or replace function public.contractor_can_read_project(project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_contractor_user()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (
          p.status in ('published', 'receiving_bids')
          or (
            p.status in ('bid_accepted', 'in_progress', 'completed')
            and p.accepted_bid_id is not null
            and exists (
              select 1
              from public.bids b
              where b.id = p.accepted_bid_id
                and b.contractor_id = auth.uid()
            )
          )
        )
    );
$$;

create or replace function public.project_visible_to_contractors(project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.status in (
        'published',
        'receiving_bids',
        'bid_accepted',
        'in_progress',
        'completed'
      )
  );
$$;

create or replace function public.customer_owns_completed_project(project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.customer_id = auth.uid()
      and p.status = 'completed'
  );
$$;

grant execute on function public.customer_owns_project(uuid) to authenticated;
grant execute on function public.contractor_can_read_project(uuid) to authenticated;
grant execute on function public.project_visible_to_contractors(uuid) to authenticated;
grant execute on function public.customer_owns_completed_project(uuid) to authenticated;

-- projects
drop policy if exists "projects: contractors read published" on public.projects;
create policy "projects: contractors read published"
  on public.projects for select
  using (public.contractor_can_read_project(id));

-- bids
drop policy if exists "bids: customer read on own project" on public.bids;
create policy "bids: customer read on own project"
  on public.bids for select
  using (public.customer_owns_project(project_id));

drop policy if exists "bids: customer update on own project" on public.bids;
create policy "bids: customer update on own project"
  on public.bids for update
  using (public.customer_owns_project(project_id));

-- project_trades
drop policy if exists "project_trades: customer manage own" on public.project_trades;
create policy "project_trades: customer manage own"
  on public.project_trades for all
  using (public.customer_owns_project(project_id))
  with check (public.customer_owns_project(project_id));

drop policy if exists "project_trades: contractors read on published" on public.project_trades;
create policy "project_trades: contractors read on published"
  on public.project_trades for select
  using (
    public.is_contractor_user()
    and public.project_visible_to_contractors(project_id)
  );

-- project_contacts
drop policy if exists "project_contacts: customer read own" on public.project_contacts;
create policy "project_contacts: customer read own"
  on public.project_contacts for select
  using (public.customer_owns_project(project_id));

drop policy if exists "project_contacts: customer insert own" on public.project_contacts;
create policy "project_contacts: customer insert own"
  on public.project_contacts for insert
  with check (public.customer_owns_project(project_id));

-- platform_invoices (asiakas)
drop policy if exists "platform_invoices: customer read on own project" on public.platform_invoices;
create policy "platform_invoices: customer read on own project"
  on public.platform_invoices for select
  using (public.customer_owns_project(project_id));

drop policy if exists "platform_invoices: customer insert on accept" on public.platform_invoices;
create policy "platform_invoices: customer insert on accept"
  on public.platform_invoices for insert
  with check (public.customer_owns_project(project_id));

-- reviews
drop policy if exists "reviews: customer create for completed" on public.reviews;
create policy "reviews: customer create for completed"
  on public.reviews for insert
  with check (
    auth.uid() = customer_id
    and public.customer_owns_completed_project(project_id)
  );

-- project_photos: ks. 20260520130000_project_photos_rls.sql (taulu luodaan 20260520100000)
