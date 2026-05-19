-- In-app ilmoitukset + asiakkaan tarjouksen hylkäys kommentilla

alter table public.bids
  add column if not exists rejection_message text,
  add column if not exists rejected_at timestamptz;

comment on column public.bids.rejection_message is 'Asiakkaan kommentti tarjouksen hylkäyksessä';
comment on column public.bids.rejected_at is 'Milloin asiakas hylkäsi tarjouksen';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link_path text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications: update own" on public.notifications;
create policy "notifications: update own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
