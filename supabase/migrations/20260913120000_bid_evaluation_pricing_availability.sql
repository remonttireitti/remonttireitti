-- Tarjousvahti: hinnoittelu (ilmainen / maksullinen) + arvioijan saatavuus

CREATE TABLE public.evaluator_profiles (
  evaluator_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  accepting_reviews boolean NOT NULL DEFAULT true,
  unavailable_note text,
  unavailable_set_by text CHECK (unavailable_set_by IN ('self', 'admin')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bid_evaluation_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pricing_mode text NOT NULL DEFAULT 'free'
    CHECK (pricing_mode IN ('free', 'paid_per_bid')),
  price_per_bid_cents int CHECK (
    price_per_bid_cents IS NULL OR price_per_bid_cents > 0
  ),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.bid_evaluation_settings (id, pricing_mode)
VALUES (1, 'free')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.bid_evaluation_requests
  ADD COLUMN IF NOT EXISTS quoted_total_cents int CHECK (
    quoted_total_cents IS NULL OR quoted_total_cents >= 0
  );

COMMENT ON TABLE public.evaluator_profiles IS
  'Arvioijan saatavuus — voi merkitä ettei ota uusia arviointeja';
COMMENT ON TABLE public.bid_evaluation_settings IS
  'Tarjousvahti-hinnoittelu: ilmainen tai hinta per tarjous';
COMMENT ON COLUMN public.bid_evaluation_requests.quoted_total_cents IS
  'Asiakkaalle näytetty hinta lähetyshetkellä (sentit)';

CREATE OR REPLACE FUNCTION public.evaluator_is_accepting_reviews(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ep.accepting_reviews
      FROM public.evaluator_profiles ep
      WHERE ep.evaluator_id = p_user_id
    ),
    true
  );
$$;

GRANT EXECUTE ON FUNCTION public.evaluator_is_accepting_reviews(uuid) TO authenticated;

ALTER TABLE public.evaluator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_evaluation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluator_profiles: read own or admin"
  ON public.evaluator_profiles FOR SELECT
  USING (evaluator_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "evaluator_profiles: evaluator update own"
  ON public.evaluator_profiles FOR UPDATE
  USING (evaluator_id = auth.uid())
  WITH CHECK (evaluator_id = auth.uid());

CREATE POLICY "evaluator_profiles: evaluator insert own"
  ON public.evaluator_profiles FOR INSERT
  WITH CHECK (evaluator_id = auth.uid());

CREATE POLICY "evaluator_profiles: admin manage"
  ON public.evaluator_profiles FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "bid_eval_settings: public read"
  ON public.bid_evaluation_settings FOR SELECT
  USING (true);

CREATE POLICY "bid_eval_settings: admin update"
  ON public.bid_evaluation_settings FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE TRIGGER evaluator_profiles_updated_at
  BEFORE UPDATE ON public.evaluator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER bid_evaluation_settings_updated_at
  BEFORE UPDATE ON public.bid_evaluation_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
