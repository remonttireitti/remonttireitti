-- Tarjouksen oletusvoimassaolo yritykselle + per-tarjous voimassaolo ja ehdot

alter table public.contractor_profiles
  add column if not exists default_quote_validity_days int not null default 30;

alter table public.contractor_profiles
  drop constraint if exists contractor_profiles_default_quote_validity_days_check;

alter table public.contractor_profiles
  add constraint contractor_profiles_default_quote_validity_days_check
  check (default_quote_validity_days >= 1 and default_quote_validity_days <= 365);

comment on column public.contractor_profiles.default_quote_validity_days is
  'Oletusvoimassaoloaika päivinä uusille tarjouslaskurin tarjouksille.';

alter table public.contractor_quotes
  add column if not exists validity_days int not null default 30;

alter table public.contractor_quotes
  drop constraint if exists contractor_quotes_validity_days_check;

alter table public.contractor_quotes
  add constraint contractor_quotes_validity_days_check
  check (validity_days >= 1 and validity_days <= 365);

comment on column public.contractor_quotes.validity_days is
  'Tarjouksen voimassaoloaika päivinä (luontipäivästä).';

alter table public.contractor_quotes
  add column if not exists terms text;

comment on column public.contractor_quotes.terms is
  'Tarjouksen ehdot (esitäytetty yrityksen oletusehdoista, muokattavissa per tarjous).';
