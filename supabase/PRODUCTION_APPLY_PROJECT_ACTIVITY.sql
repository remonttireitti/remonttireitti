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
