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
