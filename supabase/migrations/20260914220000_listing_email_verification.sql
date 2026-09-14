-- Torin kuluttajailmoitus: sähköpostivahvistus ennen julkaisua + kiintiö osoitteen mukaan.

ALTER TABLE public.equipment_listings
  ADD COLUMN IF NOT EXISTS verification_token_hash text,
  ADD COLUMN IF NOT EXISTS contact_email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_publish boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS equipment_listings_contact_email_consumer_idx
  ON public.equipment_listings (lower(contact_email))
  WHERE seller_type = 'customer';

COMMENT ON COLUMN public.equipment_listings.pending_publish IS
  'Kuluttajailmoitus odottaa contact_email-vahvistusta ennen julkaisua.';
