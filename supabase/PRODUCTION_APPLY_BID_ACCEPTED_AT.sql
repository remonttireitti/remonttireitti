-- Hyväksyntäaika (ajetaan kerran tuotannossa).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS bid_accepted_at timestamptz;

COMMENT ON COLUMN public.projects.bid_accepted_at IS
  'Aika jolloin asiakas hyväksyi tarjouksen (sopimuksen syntymishetki alustalla).';

-- Backfill: käytä projektin updated_at kun tila on hyväksytty tai myöhempi.
UPDATE public.projects
SET bid_accepted_at = updated_at
WHERE bid_accepted_at IS NULL
  AND status IN ('bid_accepted', 'in_progress', 'completed')
  AND accepted_bid_id IS NOT NULL;
