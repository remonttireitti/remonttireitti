-- Remonttireitti: aja KERRAN tuotanto-Supabasessa (SQL Editor → Run)
-- Sisältää migraation 20260914180000_project_activity_events.sql

-- ========== 20260914180000_project_activity_events.sql ==========

create table if not exists public.project_activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  event_type text not null,
  kind text not null check (kind in ('customer', 'contractor', 'system')),
  actor_id uuid,
  reference_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists project_activity_events_project_idx
  on public.project_activity_events (project_id, created_at desc);

alter table public.project_activity_events enable row level security;

-- ========== 20260914240000_project_activity_events_rls.sql ==========

create policy "project_activity_events: customer read own"
  on public.project_activity_events for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.customer_id = auth.uid()
    )
  );

create policy "project_activity_events: contractor read bid project"
  on public.project_activity_events for select
  using (
    exists (
      select 1 from public.bids b
      where b.project_id = project_id and b.contractor_id = auth.uid()
    )
  );

create policy "project_activity_events: contractor insert own"
  on public.project_activity_events for insert
  with check (
    actor_id = auth.uid()
    and kind = 'contractor'
    and exists (
      select 1 from public.bids b
      where b.project_id = project_id and b.contractor_id = auth.uid()
    )
  );
