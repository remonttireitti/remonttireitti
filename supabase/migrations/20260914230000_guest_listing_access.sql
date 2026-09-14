-- Vieras ilmoitus ilman tiliä: sähköposti + henkilökohtainen hallintalinkki

ALTER TABLE public.equipment_listings
  ALTER COLUMN seller_id DROP NOT NULL;

ALTER TABLE public.equipment_listings
  ADD COLUMN IF NOT EXISTS guest_seller_email text,
  ADD COLUMN IF NOT EXISTS access_token_hash text;

ALTER TABLE public.equipment_listings
  DROP CONSTRAINT IF EXISTS equipment_listings_owner_check;

ALTER TABLE public.equipment_listings
  ADD CONSTRAINT equipment_listings_owner_check CHECK (
    seller_id IS NOT NULL OR guest_seller_email IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS equipment_listings_guest_seller_email_idx
  ON public.equipment_listings (lower(guest_seller_email))
  WHERE guest_seller_email IS NOT NULL;

COMMENT ON COLUMN public.equipment_listings.guest_seller_email IS
  'Vieraana ilmoituksen jättäneen sähköposti ennen tilin luontia';
COMMENT ON COLUMN public.equipment_listings.access_token_hash IS
  'SHA-256 hash henkilökohtaisesta hallintalinkistä julkaisun jälkeen';
