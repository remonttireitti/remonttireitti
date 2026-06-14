-- Laitteiden liitteet (kuitit, ohjeet) ja rakennusosat (ikkunat, katto, …)

create type public.property_device_file_kind as enum (
  'kuitti',
  'kayttoohje',
  'takuu',
  'muu'
);

create type public.property_component_kind as enum (
  'katto',
  'ikkunat',
  'ovet',
  'julkisivu',
  'parveke',
  'putkisto',
  'sahko',
  'lattiat',
  'eristeet',
  'pohjarakenne',
  'valiseinat',
  'muu'
);

create table public.property_device_files (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.property_devices (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  kind public.property_device_file_kind not null default 'muu',
  label text,
  storage_path text not null,
  original_name text,
  mime_type text,
  file_size_bytes int check (file_size_bytes is null or file_size_bytes > 0),
  created_at timestamptz not null default now()
);

create index property_device_files_device_idx
  on public.property_device_files (device_id, created_at desc);

create table public.property_components (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  kind public.property_component_kind not null default 'muu',
  name text not null,
  is_original boolean,
  renewed_at date,
  material text,
  manufacturer text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_components_property_idx
  on public.property_components (property_id, kind);

create trigger property_components_updated_at
  before update on public.property_components
  for each row execute function public.set_updated_at();

alter table public.property_device_files enable row level security;
alter table public.property_components enable row level security;

create policy "property_device_files: customer all own"
  on public.property_device_files for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "property_components: customer all own"
  on public.property_components for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-documents',
  'property-documents',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

comment on table public.property_device_files is
  'Laitteen liitteet: kuitit, käyttöohjeet, takuutodistukset';
comment on table public.property_components is
  'Kiinteistön rakennusosat: katto, ikkunat jne. — alkuperäisyys ja uusimisvuosi';
