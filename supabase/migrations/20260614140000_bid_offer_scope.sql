-- Urakoitsija voi tarjota kokonaisurakkaa tai vain oman ammattinsa osuutta moniammatillisissa kohteissa.

alter table public.bids
  add column if not exists offer_scope text;

alter table public.bids
  drop constraint if exists bids_offer_scope_check;

alter table public.bids
  add constraint bids_offer_scope_check
  check (offer_scope is null or offer_scope in ('turnkey', 'own_trade'));

comment on column public.bids.offer_scope is
  'turnkey = kokonaisurakka, own_trade = vain urakoitsijan oman ammatin osuus';
