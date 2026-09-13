-- Remonttireitti: aja KERRAN tuotanto-Supabasessa (SQL Editor → Run)
-- Sisältää migraatiot 20260913100000 – 20260913170000 järjestyksessä.
-- Jos jokin kohta on jo ajettu, virhe "already exists" on ok — jatka seuraavaan.


-- ========== 20260913100000_bid_evaluation.sql ==========

-- Tarjousvahti: puolueeton maksuton tarjousarvio (asiakas 0 €)

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE 'evaluator';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TYPE public.bid_evaluation_status AS ENUM (
  'draft',
  'submitted',
  'in_review',
  'completed',
  'cancelled'
);

CREATE TYPE public.bid_evaluation_source AS ENUM ('platform', 'external');

CREATE TYPE public.bid_evaluation_verdict AS ENUM (
  'good',
  'fair',
  'ask_clarification',
  'caution'
);

CREATE TABLE public.evaluator_scopes (
  evaluator_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('heat_pump', 'general')),
  PRIMARY KEY (evaluator_id, scope)
);

CREATE TABLE public.bid_evaluation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'heat_pump' CHECK (category IN ('heat_pump', 'general')),
  heat_pump_type text,
  context_notes text,
  status public.bid_evaluation_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  completed_at timestamptz,
  assigned_evaluator_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bid_evaluation_requests_customer_idx
  ON public.bid_evaluation_requests (customer_id, created_at DESC);
CREATE INDEX bid_evaluation_requests_status_idx
  ON public.bid_evaluation_requests (status, category);

CREATE TABLE public.bid_evaluation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.bid_evaluation_requests (id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  source public.bid_evaluation_source NOT NULL DEFAULT 'external',
  bid_id uuid REFERENCES public.bids (id) ON DELETE SET NULL,
  label text NOT NULL,
  amount_cents int CHECK (amount_cents IS NULL OR amount_cents > 0),
  device_brand text,
  notes text
);

CREATE INDEX bid_evaluation_items_request_idx
  ON public.bid_evaluation_items (request_id, sort_order);

CREATE TABLE public.bid_evaluation_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.bid_evaluation_items (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_name text,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bid_evaluation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.bid_evaluation_requests (id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES public.profiles (id),
  summary text,
  questions_for_contractor text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bid_evaluation_item_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.bid_evaluation_reviews (id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.bid_evaluation_items (id) ON DELETE CASCADE,
  dimension text NOT NULL,
  score smallint CHECK (score IS NULL OR (score >= 1 AND score <= 5)),
  verdict public.bid_evaluation_verdict,
  note text,
  UNIQUE (review_id, item_id, dimension)
);

CREATE INDEX bid_evaluation_item_scores_review_idx
  ON public.bid_evaluation_item_scores (review_id);

-- Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bid-evaluation-files',
  'bid-evaluation-files',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS helpers
CREATE OR REPLACE FUNCTION public.is_evaluator_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.evaluator_scopes
    WHERE evaluator_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.evaluator_can_review_category(p_category text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_user()
    OR (
      public.is_evaluator_user()
      AND EXISTS (
        SELECT 1 FROM public.evaluator_scopes es
        WHERE es.evaluator_id = auth.uid()
          AND es.scope = p_category
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.customer_owns_bid_evaluation(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bid_evaluation_requests r
    WHERE r.id = p_request_id AND r.customer_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_evaluator_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluator_can_review_category(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_owns_bid_evaluation(uuid) TO authenticated;

ALTER TABLE public.evaluator_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_evaluation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_evaluation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_evaluation_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_evaluation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_evaluation_item_scores ENABLE ROW LEVEL SECURITY;

-- evaluator_scopes
CREATE POLICY "evaluator_scopes: admin manage"
  ON public.evaluator_scopes FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "evaluator_scopes: read own"
  ON public.evaluator_scopes FOR SELECT
  USING (evaluator_id = auth.uid() OR public.is_admin_user());

-- requests
CREATE POLICY "bid_eval_requests: customer manage own draft"
  ON public.bid_evaluation_requests FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "bid_eval_requests: evaluator read queue"
  ON public.bid_evaluation_requests FOR SELECT
  USING (
    public.evaluator_can_review_category(category)
    AND status IN ('submitted', 'in_review', 'completed')
  );

CREATE POLICY "bid_eval_requests: evaluator update in queue"
  ON public.bid_evaluation_requests FOR UPDATE
  USING (
    public.evaluator_can_review_category(category)
    AND status IN ('submitted', 'in_review')
  )
  WITH CHECK (
    public.evaluator_can_review_category(category)
    AND status IN ('submitted', 'in_review', 'completed')
  );

-- items
CREATE POLICY "bid_eval_items: customer via request"
  ON public.bid_evaluation_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_requests r
      WHERE r.id = request_id AND r.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_requests r
      WHERE r.id = request_id AND r.customer_id = auth.uid()
    )
  );

CREATE POLICY "bid_eval_items: evaluator read"
  ON public.bid_evaluation_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_requests r
      WHERE r.id = request_id
        AND public.evaluator_can_review_category(r.category)
        AND r.status IN ('submitted', 'in_review', 'completed')
    )
  );

-- files
CREATE POLICY "bid_eval_files: customer via item"
  ON public.bid_evaluation_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_items i
      JOIN public.bid_evaluation_requests r ON r.id = i.request_id
      WHERE i.id = item_id AND r.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_items i
      JOIN public.bid_evaluation_requests r ON r.id = i.request_id
      WHERE i.id = item_id AND r.customer_id = auth.uid()
    )
  );

CREATE POLICY "bid_eval_files: evaluator read"
  ON public.bid_evaluation_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_items i
      JOIN public.bid_evaluation_requests r ON r.id = i.request_id
      WHERE i.id = item_id
        AND public.evaluator_can_review_category(r.category)
        AND r.status IN ('submitted', 'in_review', 'completed')
    )
  );

-- reviews
CREATE POLICY "bid_eval_reviews: customer read own"
  ON public.bid_evaluation_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_requests r
      WHERE r.id = request_id AND r.customer_id = auth.uid()
    )
  );

CREATE POLICY "bid_eval_reviews: evaluator manage"
  ON public.bid_evaluation_reviews FOR ALL
  USING (
    evaluator_id = auth.uid()
    OR public.is_admin_user()
  )
  WITH CHECK (evaluator_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "bid_eval_reviews: evaluator read on assigned requests"
  ON public.bid_evaluation_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_requests r
      WHERE r.id = request_id
        AND public.evaluator_can_review_category(r.category)
    )
  );

-- scores
CREATE POLICY "bid_eval_scores: customer read via review"
  ON public.bid_evaluation_item_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_reviews rev
      JOIN public.bid_evaluation_requests r ON r.id = rev.request_id
      WHERE rev.id = review_id AND r.customer_id = auth.uid()
    )
  );

CREATE POLICY "bid_eval_scores: evaluator manage own review"
  ON public.bid_evaluation_item_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_reviews rev
      WHERE rev.id = review_id
        AND (rev.evaluator_id = auth.uid() OR public.is_admin_user())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bid_evaluation_reviews rev
      WHERE rev.id = review_id
        AND (rev.evaluator_id = auth.uid() OR public.is_admin_user())
    )
  );

CREATE TRIGGER bid_evaluation_requests_updated_at
  BEFORE UPDATE ON public.bid_evaluation_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.bid_evaluation_requests IS
  'Tarjousvahti: asiakkaan pyyntö puolueettomalle tarjousarvioille (0 €)';

-- ========== 20260913120000_bid_evaluation_pricing_availability.sql ==========

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

-- ========== 20260913140000_project_completion_requests.sql ==========

-- Urakoitsijan pyyntö täydentää puutteellista tarjouspyyntöä + pohjien oppiminen

CREATE TABLE public.project_completion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  criterion_ids text[] NOT NULL CHECK (cardinality(criterion_ids) > 0),
  note text,
  message_id uuid REFERENCES public.messages (id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_completion_requests_project_idx
  ON public.project_completion_requests (project_id, created_at DESC);

CREATE INDEX project_completion_requests_open_idx
  ON public.project_completion_requests (project_id)
  WHERE resolved_at IS NULL;

CREATE TABLE public.template_criterion_stats (
  job_slug text NOT NULL,
  criterion_id text NOT NULL,
  request_count int NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_slug, criterion_id)
);

COMMENT ON TABLE public.project_completion_requests IS
  'Urakoitsija pyytää asiakasta täydentämään tarjouspyyntöä';
COMMENT ON TABLE public.template_criterion_stats IS
  'Usein pyydetyt täydennykset — parantaa tulevia pohjia';

ALTER TABLE public.project_completion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_criterion_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completion_requests: contractor insert"
  ON public.project_completion_requests FOR INSERT
  WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "completion_requests: contractor read own"
  ON public.project_completion_requests FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "completion_requests: customer read own project"
  ON public.project_completion_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.customer_id = auth.uid()
    )
  );

CREATE POLICY "completion_requests: customer resolve"
  ON public.project_completion_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.customer_id = auth.uid()
    )
  );

CREATE POLICY "template_stats: public read"
  ON public.template_criterion_stats FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.increment_template_criterion_stats(
  p_job_slug text,
  p_criterion_ids text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid text;
BEGIN
  IF p_job_slug IS NULL OR p_job_slug = '' THEN
    p_job_slug := 'generic';
  END IF;
  FOREACH cid IN ARRAY p_criterion_ids LOOP
    INSERT INTO public.template_criterion_stats (job_slug, criterion_id, request_count)
    VALUES (p_job_slug, cid, 1)
    ON CONFLICT (job_slug, criterion_id)
    DO UPDATE SET
      request_count = template_criterion_stats.request_count + 1,
      updated_at = now();
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_template_criterion_stats(text, text[]) TO authenticated;

-- ========== 20260913150000_completion_request_v2.sql ==========

-- Tarjouspyynnön täydennys v2: gap-tyypit, alustava tarjous, katselut, ehdotukset

ALTER TABLE public.project_completion_requests
  ADD COLUMN IF NOT EXISTS gap_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS suggest_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preliminary_min_cents int CHECK (
    preliminary_min_cents IS NULL OR preliminary_min_cents > 0
  ),
  ADD COLUMN IF NOT EXISTS preliminary_max_cents int CHECK (
    preliminary_max_cents IS NULL OR preliminary_max_cents > 0
  ),
  ADD COLUMN IF NOT EXISTS preliminary_note text;

ALTER TABLE public.template_criterion_stats
  ADD COLUMN IF NOT EXISTS suggestion_count int NOT NULL DEFAULT 0 CHECK (suggestion_count >= 0);

CREATE TABLE IF NOT EXISTS public.project_contractor_views (
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, contractor_id)
);

CREATE INDEX IF NOT EXISTS project_contractor_views_project_idx
  ON public.project_contractor_views (project_id);

ALTER TABLE public.project_contractor_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_views: contractor upsert own"
  ON public.project_contractor_views FOR ALL
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "project_views: customer read own project"
  ON public.project_contractor_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.customer_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.increment_template_criterion_stats(
  p_job_slug text,
  p_criterion_ids text[],
  p_as_suggestion boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid text;
BEGIN
  IF p_job_slug IS NULL OR p_job_slug = '' THEN
    p_job_slug := 'generic';
  END IF;
  FOREACH cid IN ARRAY p_criterion_ids LOOP
    INSERT INTO public.template_criterion_stats (
      job_slug,
      criterion_id,
      request_count,
      suggestion_count
    )
    VALUES (
      p_job_slug,
      cid,
      1,
      CASE WHEN p_as_suggestion THEN 1 ELSE 0 END
    )
    ON CONFLICT (job_slug, criterion_id)
    DO UPDATE SET
      request_count = template_criterion_stats.request_count + 1,
      suggestion_count = template_criterion_stats.suggestion_count
        + CASE WHEN p_as_suggestion THEN 1 ELSE 0 END,
      updated_at = now();
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_template_gap_stats(
  p_job_slug text,
  p_gap_types text[],
  p_as_suggestion boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gid text;
BEGIN
  IF p_job_slug IS NULL OR p_job_slug = '' THEN
    p_job_slug := 'generic';
  END IF;
  FOREACH gid IN ARRAY p_gap_types LOOP
    INSERT INTO public.template_criterion_stats (
      job_slug,
      criterion_id,
      request_count,
      suggestion_count
    )
    VALUES (
      p_job_slug,
      'gap:' || gid,
      1,
      CASE WHEN p_as_suggestion THEN 1 ELSE 0 END
    )
    ON CONFLICT (job_slug, criterion_id)
    DO UPDATE SET
      request_count = template_criterion_stats.request_count + 1,
      suggestion_count = template_criterion_stats.suggestion_count
        + CASE WHEN p_as_suggestion THEN 1 ELSE 0 END,
      updated_at = now();
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_template_gap_stats(text, text[], boolean) TO authenticated;

-- ========== 20260913160000_contractor_work_filter.sql ==========

-- Urakoitsijan työfiltteri: minimibudjetti + kiinnostus per pyyntö

ALTER TABLE public.contractor_profiles
  ADD COLUMN IF NOT EXISTS min_budget_eur int CHECK (
    min_budget_eur IS NULL OR min_budget_eur >= 0
  );

COMMENT ON COLUMN public.contractor_profiles.min_budget_eur IS
  'Urakoitsijan minimibudjetti (€). Null = ei rajaa.';

CREATE TABLE IF NOT EXISTS public.contractor_project_interest (
  contractor_id uuid NOT NULL REFERENCES public.contractor_profiles (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  interest text NOT NULL CHECK (interest IN ('interested', 'not_interested')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contractor_id, project_id)
);

CREATE INDEX IF NOT EXISTS contractor_project_interest_contractor_idx
  ON public.contractor_project_interest (contractor_id, interest);

CREATE INDEX IF NOT EXISTS contractor_project_interest_project_idx
  ON public.contractor_project_interest (project_id);

ALTER TABLE public.contractor_project_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_interest: own read"
  ON public.contractor_project_interest FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "contractor_interest: own upsert"
  ON public.contractor_project_interest FOR ALL
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

COMMENT ON TABLE public.contractor_project_interest IS
  'Urakoitsijan kiinnostus tai piilotus yksittäiseen tarjouspyyntöön.';

-- ========== 20260913170000_evaluator_scope_areas.sql ==========

-- Laajenna arvioijaoikeudet kaikkiin tarjouspyyntöalueisiin

ALTER TABLE public.evaluator_scopes
  DROP CONSTRAINT IF EXISTS evaluator_scopes_scope_check;

ALTER TABLE public.bid_evaluation_requests
  DROP CONSTRAINT IF EXISTS bid_evaluation_requests_category_check;

UPDATE public.evaluator_scopes
SET scope = 'lammitys'
WHERE scope = 'heat_pump';

CREATE OR REPLACE FUNCTION public.evaluator_can_review_category(p_category text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_user()
    OR (
      public.is_evaluator_user()
      AND EXISTS (
        SELECT 1 FROM public.evaluator_scopes es
        WHERE es.evaluator_id = auth.uid()
          AND (
            es.scope = p_category
            OR (es.scope = 'heat_pump' AND p_category IN ('heat_pump', 'lammitys'))
            OR (
              es.scope = 'general'
              AND p_category IN (
                'general',
                'puulammitys',
                'sahko-energia',
                'lvi-ilma',
                'sisatilat',
                'ulkokuori',
                'perustus-runko',
                'piha',
                'palvelut'
              )
            )
          )
      )
    );
$$;

COMMENT ON TABLE public.evaluator_scopes IS
  'Arvioijan oikeudet tarjouspyyntöalueittain (PROJECT_AREAS.slug). Vanhat heat_pump/general tuettu SQL-funktiossa.';

-- ========== 20260913180000_guest_project_access.sql ==========

-- Vieras tarjouspyyntö: sähköposti + henkilökohtainen linkki ilman tiliä

ALTER TABLE public.projects
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS access_token_hash text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_publish boolean NOT NULL DEFAULT false;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_owner_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_owner_check CHECK (
    customer_id IS NOT NULL OR guest_email IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS projects_guest_email_idx
  ON public.projects (lower(guest_email))
  WHERE guest_email IS NOT NULL;

COMMENT ON COLUMN public.projects.guest_email IS
  'Vieraana jättäneen asiakkaan sähköposti ennen tilin luontia';
COMMENT ON COLUMN public.projects.access_token_hash IS
  'SHA-256 hash henkilökohtaisesta linkistä (raakaa tokenia ei tallenneta)';
COMMENT ON COLUMN public.projects.pending_publish IS
  'True kun asiakas halusi julkaista — julkaistaan sähköpostivahvistuksen jälkeen';


-- ========== 20260913190000_bid_trade_scope.sql ==========

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS offered_trade_ids uuid[] DEFAULT NULL;

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS turnkey_coordination text;

ALTER TABLE public.bids
  DROP CONSTRAINT IF EXISTS bids_turnkey_coordination_check;

ALTER TABLE public.bids
  ADD CONSTRAINT bids_turnkey_coordination_check
  CHECK (
    turnkey_coordination IS NULL
    OR turnkey_coordination IN ('subcontract', 'customer_sources')
  );

COMMENT ON COLUMN public.bids.offered_trade_ids IS
  'Urakoitsijan tarjoamat ammatit (own_trade). Tyhjä = kaikki omat osumat.';

COMMENT ON COLUMN public.bids.turnkey_coordination IS
  'turnkey: subcontract = alihankkijat, customer_sources = asiakas hankkii puuttuvat.';
