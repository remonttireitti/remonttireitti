-- Asiakkaan suosittelu: bonus kun suositellun tarjouspyyntö saa tarjouksia.

ALTER TYPE public.platform_fee_waiver_reason ADD VALUE IF NOT EXISTS 'customer_referral';

CREATE TABLE IF NOT EXISTS public.customer_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  referred_customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  referrer_email_at_signup text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_referrals_no_self CHECK (referrer_customer_id <> referred_customer_id),
  UNIQUE (referred_customer_id)
);

CREATE INDEX IF NOT EXISTS customer_referrals_referrer_idx
  ON public.customer_referrals (referrer_customer_id, created_at DESC);

COMMENT ON TABLE public.customer_referrals IS
  'Asiakas toi uuden asiakkaan — suosittelija saa bonuksen kun suositellun tarjouspyyntö saa tarjouksia.';

CREATE TABLE IF NOT EXISTS public.customer_referral_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  customer_referral_id uuid NOT NULL REFERENCES public.customer_referrals (id) ON DELETE CASCADE,
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  earned_from_project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used', 'cancelled')),
  used_on_project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  used_on_invoice_id uuid REFERENCES public.platform_invoices (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  UNIQUE (customer_referral_id)
);

CREATE INDEX IF NOT EXISTS customer_referral_credits_customer_available_idx
  ON public.customer_referral_credits (customer_id, created_at)
  WHERE status = 'available';

ALTER TABLE public.customer_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_referral_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_referrals: admin read"
  ON public.customer_referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

CREATE POLICY "customer_referrals: referrer read own"
  ON public.customer_referrals FOR SELECT
  USING (referrer_customer_id = auth.uid());

CREATE POLICY "customer_referral_credits: owner read"
  ON public.customer_referral_credits FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "customer_referral_credits: admin read"
  ON public.customer_referral_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.get_customer_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.id
  FROM public.profiles pr
  INNER JOIN auth.users au ON au.id = pr.id
  WHERE pr.role = 'customer'
    AND lower(trim(au.email)) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_customer_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_id_by_email(text) TO service_role;
