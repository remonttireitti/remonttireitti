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
