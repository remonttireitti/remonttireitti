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
