-- Remonttireitti: täydennyspyynnöt + vieraslinkki (urakoitsija → asiakas)
-- Aja KERRAN Supabase SQL Editorissa jos täydennyspyyntö / sähköpostilinkki epäonnistuu.

-- Vieraslinkki (tarvitaan sähköpostilinkin avaukseen)
ALTER TABLE public.projects
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS access_token_hash text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_publish boolean NOT NULL DEFAULT false;

-- v1: taulu + perus-RLS + criterion stats
CREATE TABLE IF NOT EXISTS public.project_completion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  criterion_ids text[] NOT NULL CHECK (cardinality(criterion_ids) > 0),
  note text,
  message_id uuid REFERENCES public.messages (id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_completion_requests_project_idx
  ON public.project_completion_requests (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS project_completion_requests_open_idx
  ON public.project_completion_requests (project_id)
  WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS public.template_criterion_stats (
  job_slug text NOT NULL,
  criterion_id text NOT NULL,
  request_count int NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_slug, criterion_id)
);

ALTER TABLE public.project_completion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_criterion_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_completion_requests'
      AND policyname = 'completion_requests: contractor insert'
  ) THEN
    CREATE POLICY "completion_requests: contractor insert"
      ON public.project_completion_requests FOR INSERT
      WITH CHECK (contractor_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_completion_requests'
      AND policyname = 'completion_requests: contractor read own'
  ) THEN
    CREATE POLICY "completion_requests: contractor read own"
      ON public.project_completion_requests FOR SELECT
      USING (contractor_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_completion_requests'
      AND policyname = 'completion_requests: customer read own project'
  ) THEN
    CREATE POLICY "completion_requests: customer read own project"
      ON public.project_completion_requests FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_id AND p.customer_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_completion_requests'
      AND policyname = 'completion_requests: customer resolve'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'template_criterion_stats'
      AND policyname = 'template_stats: public read'
  ) THEN
    CREATE POLICY "template_stats: public read"
      ON public.template_criterion_stats FOR SELECT
      USING (true);
  END IF;
END $$;

-- v2: gap-tyypit, alustava tarjous, katselut, ehdotukset
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_contractor_views'
      AND policyname = 'project_views: contractor upsert own'
  ) THEN
    CREATE POLICY "project_views: contractor upsert own"
      ON public.project_contractor_views FOR ALL
      USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_contractor_views'
      AND policyname = 'project_views: customer read own project'
  ) THEN
    CREATE POLICY "project_views: customer read own project"
      ON public.project_contractor_views FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_id AND p.customer_id = auth.uid()
        )
      );
  END IF;
END $$;

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

GRANT EXECUTE ON FUNCTION public.increment_template_criterion_stats(text, text[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_template_gap_stats(text, text[], boolean) TO authenticated;
