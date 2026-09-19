-- Urakoitsijan laskurihinnat (työtunti, kate, yksikköhinnat)
alter table public.contractor_profiles
  add column if not exists calculator_pricing_rates jsonb not null default '{}'::jsonb;

comment on column public.contractor_profiles.calculator_pricing_rates is
  'Urakoitsijan tarjouslaskurin oletushinnat: työtunti, kate %, matka €/km, jäte, rivikohtaiset hinnat.';
