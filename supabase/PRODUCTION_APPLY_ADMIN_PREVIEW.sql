-- Admin-esikatselutila: is_admin_preview projects + bids.
-- Aja tuotannossa ennen deployausta.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_admin_preview boolean NOT NULL DEFAULT false;

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS is_admin_preview boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS projects_admin_preview_idx
  ON public.projects (is_admin_preview)
  WHERE is_admin_preview = true;

CREATE INDEX IF NOT EXISTS bids_admin_preview_idx
  ON public.bids (is_admin_preview)
  WHERE is_admin_preview = true;
