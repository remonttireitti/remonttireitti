-- Kohteen huoltokirja: kiinteistöt ja merkinnät valmiista urakoista.

create type public.property_log_source as enum ('platform', 'manual');

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  address_line text not null default '',
  postal_code text not null,
  municipality text not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index properties_customer_location_uidx
  on public.properties (
    customer_id,
    lower(trim(postal_code)),
    lower(trim(municipality)),
    lower(trim(address_line))
  );

create table public.property_log_entries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  source public.property_log_source not null default 'platform',
  title text not null,
  description text,
  performed_at date not null,
  contractor_name text,
  amount_cents int check (amount_cents is null or amount_cents > 0),
  project_id uuid references public.projects (id) on delete set null,
  bid_id uuid references public.bids (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index property_log_entries_project_uidx
  on public.property_log_entries (project_id)
  where project_id is not null;

create index property_log_entries_property_idx
  on public.property_log_entries (property_id, performed_at desc);

create index property_log_entries_customer_idx
  on public.property_log_entries (customer_id, performed_at desc);

create trigger properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create trigger property_log_entries_updated_at
  before update on public.property_log_entries
  for each row execute function public.set_updated_at();

alter table public.properties enable row level security;
alter table public.property_log_entries enable row level security;

create policy "properties: customer read own"
  on public.properties for select
  using (customer_id = auth.uid());

create policy "properties: customer insert own"
  on public.properties for insert
  with check (customer_id = auth.uid());

create policy "properties: customer update own"
  on public.properties for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "properties: customer delete own"
  on public.properties for delete
  using (customer_id = auth.uid());

create policy "property_log_entries: customer read own"
  on public.property_log_entries for select
  using (customer_id = auth.uid());

create policy "property_log_entries: customer insert own"
  on public.property_log_entries for insert
  with check (customer_id = auth.uid());

create policy "property_log_entries: customer update own"
  on public.property_log_entries for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "property_log_entries: customer delete own"
  on public.property_log_entries for delete
  using (customer_id = auth.uid());

comment on table public.properties is 'Asiakkaan kohteet (osoite) huoltokirjaa varten';
comment on table public.property_log_entries is 'Huoltokirjan merkinnät — automaattisesti valmiista urakoista tai manuaalisesti';
