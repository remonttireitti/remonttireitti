-- Tarjouksen takuuehdot, aloituspäivä ja urakoitsijan vakuutukset
alter table public.bids
  add column if not exists warranty_work text,
  add column if not exists warranty_equipment text,
  add column if not exists earliest_start_date date,
  add column if not exists confirms_licenses boolean not null default false,
  add column if not exists confirms_building_standards boolean not null default false;

comment on column public.bids.warranty_work is 'Urakoitsijan takuuehdot työlle';
comment on column public.bids.warranty_equipment is 'Urakoitsijan takuuehdot laitteelle (tyhjä jos asiakas hankkii laitteet)';
comment on column public.bids.earliest_start_date is 'Ensimmäinen mahdollinen toteutuspäivä';
comment on column public.bids.confirms_licenses is 'Urakoitsija vakuuttaa tarvittavat luvat';
comment on column public.bids.confirms_building_standards is 'Urakoitsija vakuuttaa rakennusvaatimusten noudattamisen';
