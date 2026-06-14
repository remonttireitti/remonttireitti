-- Sivulatausten analytiikka (evästehyväksynnän jälkeen, admin-näkymä)

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  user_id uuid references public.profiles (id) on delete set null,
  session_id text not null,
  created_at timestamptz not null default now()
);

create index page_views_created_at_idx on public.page_views (created_at desc);
create index page_views_path_idx on public.page_views (path, created_at desc);

alter table public.page_views enable row level security;

create policy "page_views: admin select"
  on public.page_views for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

comment on table public.page_views is
  'Sivulataukset analytiikkaa varten. Insert service roolilla API-reitistä.';
