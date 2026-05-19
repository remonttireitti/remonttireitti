-- Torin tuoteryhmät: laitteet, varaosat, tarvikkeet, työkalut

create type public.equipment_listing_product_category as enum (
  'device',
  'spare_part',
  'supply',
  'tool'
);

alter table public.equipment_listings
  add column if not exists product_category public.equipment_listing_product_category not null default 'device';

comment on column public.equipment_listings.product_category is 'Tuoteryhmä: laite, varaosa, tarvike, työkalu';

create index if not exists equipment_listings_product_category_idx
  on public.equipment_listings (product_category)
  where status = 'published';
