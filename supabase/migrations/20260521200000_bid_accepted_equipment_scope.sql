-- Mitä asiakas hyväksyi, kun tarjouksessa oli valinnainen laite
alter table public.bids
  add column if not exists accepted_includes_equipment boolean;

comment on column public.bids.accepted_includes_equipment is
  'true = asiakas hyväksyi asennuksen ja laitteen; false = vain asennus; null = ei vielä hyväksytty';
