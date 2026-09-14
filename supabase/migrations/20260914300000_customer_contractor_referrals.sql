-- Asiakas voi suositella myös urakoitsijaa — bonus kun tuotu urakoitsija voittaa diilin.

CREATE TABLE IF NOT EXISTS public.customer_contractor_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  referred_contractor_id uuid NOT NULL REFERENCES public.contractor_profiles (id) ON DELETE CASCADE,
  referrer_email_at_signup text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_contractor_referrals_no_self CHECK (referrer_customer_id <> referred_contractor_id),
  UNIQUE (referred_contractor_id)
);

CREATE INDEX IF NOT EXISTS customer_contractor_referrals_referrer_idx
  ON public.customer_contractor_referrals (referrer_customer_id, created_at DESC);

COMMENT ON TABLE public.customer_contractor_referrals IS
  'Asiakas toi uuden urakoitsijan — suosittelija saa bonuksen kun urakoitsija voittaa diilin.';

ALTER TABLE public.customer_referral_credits
  ALTER COLUMN customer_referral_id DROP NOT NULL;

ALTER TABLE public.customer_referral_credits
  ADD COLUMN IF NOT EXISTS customer_contractor_referral_id uuid
    REFERENCES public.customer_contractor_referrals (id) ON DELETE CASCADE;

ALTER TABLE public.customer_referral_credits
  DROP CONSTRAINT IF EXISTS customer_referral_credits_source_check;

ALTER TABLE public.customer_referral_credits
  ADD CONSTRAINT customer_referral_credits_source_check
  CHECK (
    (customer_referral_id IS NOT NULL AND customer_contractor_referral_id IS NULL)
    OR (customer_referral_id IS NULL AND customer_contractor_referral_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS customer_referral_credits_contractor_ref_uidx
  ON public.customer_referral_credits (customer_contractor_referral_id)
  WHERE customer_contractor_referral_id IS NOT NULL;

ALTER TABLE public.customer_contractor_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_contractor_referrals: admin read"
  ON public.customer_contractor_referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

CREATE POLICY "customer_contractor_referrals: referrer read own"
  ON public.customer_contractor_referrals FOR SELECT
  USING (referrer_customer_id = auth.uid());
