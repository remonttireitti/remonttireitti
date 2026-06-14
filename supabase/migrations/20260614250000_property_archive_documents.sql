-- Kiinteistötason asiakirjat: kiinteistökirja, rakennussuunnitelmat jne.

create type public.property_archive_document_kind as enum (
  'kiinteistokirja',
  'rakennussuunnitelma',
  'pohjapiirustus',
  'energiatodistus',
  'kartaasto',
  'isannointi',
  'vakuutus',
  'muu'
);

create table public.property_archive_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  kind public.property_archive_document_kind not null default 'muu',
  label text,
  storage_path text not null,
  original_name text,
  mime_type text,
  file_size_bytes int check (file_size_bytes is null or file_size_bytes > 0),
  created_at timestamptz not null default now()
);

create index property_archive_documents_property_idx
  on public.property_archive_documents (property_id, created_at desc);

alter table public.property_archive_documents enable row level security;

create policy "property_archive_documents: customer all own"
  on public.property_archive_documents for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

comment on table public.property_archive_documents is
  'Kiinteistön asiakirjat: kiinteistökirja, rakennussuunnitelmat, energiatodistus jne.';
