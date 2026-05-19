-- Tori-ilmoitusten kuvat

create table public.equipment_listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.equipment_listings (id) on delete cascade,
  storage_path text not null,
  original_name text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index equipment_listing_photos_listing_idx
  on public.equipment_listing_photos (listing_id, sort_order);

alter table public.equipment_listing_photos enable row level security;

drop policy if exists "listing_photos: read published" on public.equipment_listing_photos;
create policy "listing_photos: read published"
  on public.equipment_listing_photos for select
  using (
    exists (
      select 1 from public.equipment_listings el
      where el.id = listing_id
        and el.status = 'published'
    )
  );

drop policy if exists "listing_photos: seller manage own" on public.equipment_listing_photos;
create policy "listing_photos: seller manage own"
  on public.equipment_listing_photos for all
  using (
    exists (
      select 1 from public.equipment_listings el
      where el.id = listing_id
        and el.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.equipment_listings el
      where el.id = listing_id
        and el.seller_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;
