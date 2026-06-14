-- Tori: myynti- ja ostopyynnöt

create type public.equipment_listing_kind as enum ('sell', 'wanted');

alter table public.equipment_listings
  add column listing_kind public.equipment_listing_kind not null default 'sell';

create index equipment_listings_kind_idx
  on public.equipment_listings (listing_kind, status, published_at desc);

comment on column public.equipment_listings.listing_kind is
  'sell = myydään, wanted = haluan ostaa';
