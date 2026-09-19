-- Tori: lahjoitusilmoitukset (annetaan ilmaiseksi).

ALTER TYPE public.equipment_listing_kind ADD VALUE IF NOT EXISTS 'donate';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_donations_given int NOT NULL DEFAULT 0
    CHECK (free_donations_given >= 0);

COMMENT ON COLUMN public.profiles.free_donations_given IS
  'Vahvistetut tavaran lahjoitukset torilla (saaja kuittasi noudon).';

ALTER TABLE public.equipment_listings
  ADD COLUMN IF NOT EXISTS donation_recipient_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.equipment_listings.donation_recipient_id IS
  'Lahjoitusilmoituksella valittu saaja (noutaja).';

CREATE TABLE IF NOT EXISTS public.listing_donation_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL UNIQUE REFERENCES public.equipment_listings (id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  seller_handed_over_at timestamptz,
  recipient_confirmed_at timestamptz,
  recipient_rejected boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'selected'
    CHECK (status IN ('selected', 'pending_recipient', 'confirmed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_donation_completions_recipient_pending_idx
  ON public.listing_donation_completions (recipient_id, status)
  WHERE status = 'pending_recipient';

ALTER TABLE public.listing_donation_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_donation_completions: parties read"
  ON public.listing_donation_completions FOR SELECT
  USING (auth.uid() = seller_id OR auth.uid() = recipient_id);

CREATE POLICY "listing_donation_completions: seller insert update"
  ON public.listing_donation_completions FOR ALL
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "listing_donation_completions: recipient confirm"
  ON public.listing_donation_completions FOR UPDATE
  USING (auth.uid() = recipient_id);

COMMENT ON COLUMN public.equipment_listings.listing_kind IS
  'sell = myydään, wanted = haluan ostaa, donate = lahjoitus (0 €)';
