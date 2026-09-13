-- Yritystiedot tarjousvertailuun: perustamisvuosi ja henkilömääräluokka.

alter table public.contractor_profiles
  add column if not exists founded_year int;

alter table public.contractor_profiles
  add column if not exists company_size_band text;

alter table public.contractor_profiles
  drop constraint if exists contractor_profiles_founded_year_check;

alter table public.contractor_profiles
  add constraint contractor_profiles_founded_year_check
  check (
    founded_year is null
    or (founded_year >= 1900 and founded_year <= extract(year from now())::int)
  );

alter table public.contractor_profiles
  drop constraint if exists contractor_profiles_company_size_band_check;

alter table public.contractor_profiles
  add constraint contractor_profiles_company_size_band_check
  check (
    company_size_band is null
    or company_size_band in ('under_10', '10_50', '51_100', 'over_100')
  );

comment on column public.contractor_profiles.founded_year is
  'Yrityksen perustamisvuosi (itse ilmoitettu).';

comment on column public.contractor_profiles.company_size_band is
  'Henkilömääräluokka: under_10, 10_50, 51_100, over_100.';
