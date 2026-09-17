-- Hyväksyntäaika urakkasopimusyhteenvedolle.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS bid_accepted_at timestamptz;

COMMENT ON COLUMN public.projects.bid_accepted_at IS
  'Aika jolloin asiakas hyväksyi tarjouksen (sopimuksen syntymishetki alustalla).';
