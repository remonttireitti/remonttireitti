-- Aja tuotannossa ennen deploya: kuluttajailmoituksen sähköpostivahvistus.

ALTER TABLE public.equipment_listings
  ADD COLUMN IF NOT EXISTS verification_token_hash text,
  ADD COLUMN IF NOT EXISTS contact_email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_publish boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS equipment_listings_contact_email_consumer_idx
  ON public.equipment_listings (lower(contact_email))
  WHERE seller_type = 'customer';
