-- Keskusyksikkö (hub) ≠ ilmanvaihto. ESP-NOW-laitteet liitetään myöhemmin.

alter table public.controllers rename to hubs;

alter table public.commands rename column controller_id to hub_id;

alter table public.commands
  drop constraint if exists commands_controller_id_fkey;

alter table public.commands
  add constraint commands_hub_id_fkey
  foreign key (hub_id) references public.hubs (id) on delete cascade;

drop index if exists commands_pending_idx;
create index commands_pending_idx
  on public.commands (hub_id, created_at)
  where status = 'pending';

alter table public.hubs alter column device_type set default 'hub';
update public.hubs set device_type = 'hub' where device_type = 'ventilation_controller';

-- Tuleva: ESP-NOW-satelliitit (anturit, releet, …)
create table public.satellite_devices (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  mac_address text not null,
  device_role text not null default 'sensor',
  state jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hub_id, mac_address)
);

create index satellite_devices_hub_idx on public.satellite_devices (hub_id);

create trigger satellite_devices_updated_at
  before update on public.satellite_devices
  for each row execute function public.set_updated_at();

alter table public.satellite_devices enable row level security;

create policy "satellite_devices: user read own"
  on public.satellite_devices for select using (user_id = auth.uid());

create policy "satellite_devices: user insert own"
  on public.satellite_devices for insert with check (user_id = auth.uid());

create policy "satellite_devices: user update own"
  on public.satellite_devices for update using (user_id = auth.uid());

create policy "satellite_devices: user delete own"
  on public.satellite_devices for delete using (user_id = auth.uid());

-- RLS policy names päivitetään (taulu uudelleennimetty)
drop policy if exists "controllers: user read own" on public.hubs;
drop policy if exists "controllers: user insert own" on public.hubs;
drop policy if exists "controllers: user update own" on public.hubs;
drop policy if exists "controllers: user delete own" on public.hubs;

create policy "hubs: user read own" on public.hubs for select using (user_id = auth.uid());
create policy "hubs: user insert own" on public.hubs for insert with check (user_id = auth.uid());
create policy "hubs: user update own" on public.hubs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hubs: user delete own" on public.hubs for delete using (user_id = auth.uid());

comment on table public.hubs is 'Keskusyksiköt (Guition ESP32-P4). Hallitsevat automaatiota ja ESP-NOW-satelliitteja.';
comment on table public.satellite_devices is 'ESP-NOW-laitteet kytkettynä keskusyksikköön.';
