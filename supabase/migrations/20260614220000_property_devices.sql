-- Kiinteistön laiterekisteri (huoltokirja): LTO, lämpöpumput, kodinkoneet, …

create type public.property_device_category as enum (
  'lto',
  'ilmalampopumppu',
  'ilmavesilampopumppu',
  'maalampopumppu',
  'poistoilmalampopumppu',
  'ilmastointikone',
  'jääkaappi',
  'pakastin',
  'astianpesukone',
  'pesukone',
  'kuivausrumpu',
  'uuni_liesi',
  'mikroaaltouuni',
  'televisio',
  'grilli',
  'aurinkopaneelit',
  'latausasema',
  'muu'
);

create table public.property_devices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  category public.property_device_category not null default 'muu',
  name text not null,
  manufacturer text,
  model text,
  serial_number text,
  location text,
  purchased_at date,
  installed_at date,
  warranty_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_devices_property_idx
  on public.property_devices (property_id, category);

create index property_devices_warranty_idx
  on public.property_devices (property_id, warranty_until)
  where warranty_until is not null;

create trigger property_devices_updated_at
  before update on public.property_devices
  for each row execute function public.set_updated_at();

alter table public.property_devices enable row level security;

create policy "property_devices: customer read own"
  on public.property_devices for select
  using (customer_id = auth.uid());

create policy "property_devices: customer insert own"
  on public.property_devices for insert
  with check (customer_id = auth.uid());

create policy "property_devices: customer update own"
  on public.property_devices for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "property_devices: customer delete own"
  on public.property_devices for delete
  using (customer_id = auth.uid());

comment on table public.property_devices is
  'Kiinteistön laiterekisteri: lämpöpumput, LTO, kodinkoneet jne.';
