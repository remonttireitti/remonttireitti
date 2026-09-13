-- Remonttireitti: yritystiedot (perustamisvuosi + henkilömäärä)
-- Aja KERRAN Supabase SQL Editorissa jos profiilin tallennus epäonnistuu:
-- "Could not find the 'company_size_band' column..."

ALTER TABLE public.contractor_profiles
  ADD COLUMN IF NOT EXISTS founded_year int;

ALTER TABLE public.contractor_profiles
  ADD COLUMN IF NOT EXISTS company_size_band text;

ALTER TABLE public.contractor_profiles
  DROP CONSTRAINT IF EXISTS contractor_profiles_founded_year_check;

ALTER TABLE public.contractor_profiles
  ADD CONSTRAINT contractor_profiles_founded_year_check
  CHECK (
    founded_year IS NULL
    OR (founded_year >= 1900 AND founded_year <= extract(year FROM now())::int)
  );

ALTER TABLE public.contractor_profiles
  DROP CONSTRAINT IF EXISTS contractor_profiles_company_size_band_check;

ALTER TABLE public.contractor_profiles
  ADD CONSTRAINT contractor_profiles_company_size_band_check
  CHECK (
    company_size_band IS NULL
    OR company_size_band IN ('under_10', '10_50', '51_100', 'over_100')
  );
