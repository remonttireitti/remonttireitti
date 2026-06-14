-- Palvelun käyttökokemuspalaute (asiakkaat ja urakoitsijat).

create type public.platform_feedback_role as enum ('customer', 'contractor');

create type public.platform_feedback_context as enum (
  'general',
  'project_complete'
);

create table public.platform_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.platform_feedback_role not null,
  context public.platform_feedback_context not null default 'general',
  project_id uuid references public.projects (id) on delete set null,
  clarity_rating int not null check (clarity_rating between 1 and 5),
  experience_rating int not null check (experience_rating between 1 and 5),
  would_recommend boolean not null,
  suggestions text,
  created_at timestamptz not null default now()
);

create unique index platform_feedback_user_project_uidx
  on public.platform_feedback (user_id, project_id)
  where project_id is not null;

create index platform_feedback_created_idx
  on public.platform_feedback (created_at desc);

create index platform_feedback_role_idx
  on public.platform_feedback (role, created_at desc);

alter table public.platform_feedback enable row level security;

create policy "platform_feedback: insert own"
  on public.platform_feedback for insert
  with check (user_id = auth.uid());

create policy "platform_feedback: read own"
  on public.platform_feedback for select
  using (user_id = auth.uid());

create policy "platform_feedback: admin read all"
  on public.platform_feedback for select
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'admin'
    )
  );
