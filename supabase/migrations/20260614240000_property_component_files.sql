-- Rakennusosien liitteet (kuitit, takuut, urakkasopimukset)

create table public.property_component_files (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.property_components (id) on delete cascade,
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

create index property_component_files_component_idx
  on public.property_component_files (component_id, created_at desc);

alter table public.property_component_files enable row level security;

create policy "property_component_files: customer all own"
  on public.property_component_files for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

comment on table public.property_component_files is
  'Rakennusosan liitteet: kattoremontin kuitti, takuu jne.';
