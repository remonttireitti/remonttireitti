-- Valinnainen laiterivi tarjouksessa, kun asiakas hankkii laitteet mutta sallii urakoitsijan tarjouksen.
alter table public.bids
  add column if not exists offers_equipment boolean not null default false,
  add column if not exists equipment_amount_cents int,
  add column if not exists equipment_description text;

alter table public.bids
  drop constraint if exists bids_equipment_amount_check;

alter table public.bids
  add constraint bids_equipment_amount_check
  check (
    equipment_amount_cents is null
    or equipment_amount_cents > 0
  );

comment on column public.bids.offers_equipment is 'Urakoitsija tarjoaa laitetta erillisellä summalla (asiakas voi hankkia itse)';
comment on column public.bids.equipment_amount_cents is 'Laitteen hinta sentteinä, erillään amount_cents (asennus/työ)';
comment on column public.bids.equipment_description is 'Laitemalli / toimitus lyhyesti';
