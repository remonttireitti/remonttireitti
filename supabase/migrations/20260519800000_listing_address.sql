alter table public.equipment_listings
  add column if not exists address_line text;
