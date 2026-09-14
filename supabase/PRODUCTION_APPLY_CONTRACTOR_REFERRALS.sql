-- Urakoitsijoiden suosittelu (ajetaan tuotannossa kerran).

CREATE TYPE public.platform_fee_waiver_reason AS ENUM (
  'beta',
  'referral',
  'subscription'
);

ALTER TABLE public.platform_invoices
  ADD COLUMN IF NOT EXISTS fee_waiver_reason public.platform_fee_waiver_reason;

CREATE TABLE IF NOT EXISTS public.contractor_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_contractor_id uuid NOT NULL REFERENCES public.contractor_profiles (id) ON DELETE CASCADE,
  referred_contractor_id uuid NOT NULL REFERENCES public.contractor_profiles (id) ON DELETE CASCADE,
  referrer_email_at_signup text NOT NULL,
  free_deals_per_referral int NOT NULL DEFAULT 2 CHECK (free_deals_per_referral > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contractor_referrals_no_self CHECK (referrer_contractor_id <> referred_contractor_id),
  UNIQUE (referred_contractor_id)
);

CREATE INDEX IF NOT EXISTS contractor_referrals_referrer_idx
  ON public.contractor_referrals (referrer_contractor_id, created_at DESC);

ALTER TABLE public.contractor_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contractor_referrals: admin read" ON public.contractor_referrals;
CREATE POLICY "contractor_referrals: admin read"
  ON public.contractor_referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "contractor_referrals: referrer read own" ON public.contractor_referrals;
CREATE POLICY "contractor_referrals: referrer read own"
  ON public.contractor_referrals FOR SELECT
  USING (referrer_contractor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_contractor_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.id
  FROM public.contractor_profiles cp
  INNER JOIN auth.users au ON au.id = cp.id
  INNER JOIN public.profiles pr ON pr.id = cp.id
  WHERE pr.role = 'contractor'
    AND lower(trim(au.email)) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_contractor_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contractor_id_by_email(text) TO service_role;
