-- Älykoti: oma Supabase-projekti (EI Remonttireitti)
-- Riippuvuudet: vain auth.users

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type public.command_status as enum (
  'pending',
  'delivered',
  'acked',
  'failed'
);

create type public.control_mode as enum (
  'auto',
  'manual'
);

create table public.controllers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  device_token text not null unique,
  device_type text not null default 'ventilation_controller',
  firmware_version text,
  last_seen_at timestamptz,
  control_mode public.control_mode not null default 'auto',
  state jsonb not null default '{}'::jsonb,
  config jsonb not null default '{
    "co2_normal_max": 800,
    "co2_elevated_max": 1000,
    "co2_high_max": 1200,
    "speed_normal": 2,
    "speed_elevated": 3,
    "speed_high": 4,
    "speed_max": 5
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index controllers_user_idx
  on public.controllers (user_id, updated_at desc);

create trigger controllers_updated_at
  before update on public.controllers
  for each row execute function public.set_updated_at();

create table public.commands (
  id uuid primary key default gen_random_uuid(),
  controller_id uuid not null references public.controllers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.command_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  acked_at timestamptz
);

create index commands_pending_idx
  on public.commands (controller_id, created_at)
  where status = 'pending';

alter table public.controllers enable row level security;
alter table public.commands enable row level security;

create policy "controllers: user read own"
  on public.controllers for select
  using (user_id = auth.uid());

create policy "controllers: user insert own"
  on public.controllers for insert
  with check (user_id = auth.uid());

create policy "controllers: user update own"
  on public.controllers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "controllers: user delete own"
  on public.controllers for delete
  using (user_id = auth.uid());

create policy "commands: user read own"
  on public.commands for select
  using (user_id = auth.uid());

create policy "commands: user insert own"
  on public.commands for insert
  with check (user_id = auth.uid());

create policy "commands: user update own"
  on public.commands for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.controllers is
  'ESP32-keskusyksiköt. Laite synkronoi device_tokenilla web-API:n kautta.';

comment on column public.controllers.config is
  'Automaatioasetukset: CO2-kynnykset ja nopeusvasteet. Web muokkaa, ESP32 lukee synkissä.';
