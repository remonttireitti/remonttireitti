-- Tarjouksen laajuus- ja sopimusehdot + urakoitsijan oletukset

alter table public.bids
  add column if not exists scope_terms text,
  add column if not exists contract_terms text;

comment on column public.bids.scope_terms is 'Mitä asennus/työ sisältää (perusasennus, rajaukset)';
comment on column public.bids.contract_terms is 'Maksu-, peruutus- ja muut sopimusehdot';

alter table public.contractor_profiles
  add column if not exists default_bid_scope_terms text,
  add column if not exists default_bid_contract_terms text,
  add column if not exists default_bid_warranty_work text,
  add column if not exists default_bid_warranty_equipment text;

comment on column public.contractor_profiles.default_bid_scope_terms is 'Oletus: tarjouksen asennuksen laajuus';
comment on column public.contractor_profiles.default_bid_contract_terms is 'Oletus: tarjouksen sopimusehdot';
comment on column public.contractor_profiles.default_bid_warranty_work is 'Oletus: työn takuuehdot';
comment on column public.contractor_profiles.default_bid_warranty_equipment is 'Oletus: laitteen takuuehdot';
