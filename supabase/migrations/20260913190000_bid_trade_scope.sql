-- Tarjouksen ammattikohtainen laajuus moniammatillisissa kohteissa.

alter table public.bids
  add column if not exists offered_trade_ids uuid[] default null;

alter table public.bids
  add column if not exists turnkey_coordination text;

alter table public.bids
  drop constraint if exists bids_turnkey_coordination_check;

alter table public.bids
  add constraint bids_turnkey_coordination_check
  check (
    turnkey_coordination is null
    or turnkey_coordination in ('subcontract', 'customer_sources')
  );

comment on column public.bids.offered_trade_ids is
  'Urakoitsijan tarjoamat ammatit (own_trade). Tyhjä = kaikki omat osumat.';

comment on column public.bids.turnkey_coordination is
  'turnkey: subcontract = alihankkijat, customer_sources = asiakas hankkii puuttuvat.';
