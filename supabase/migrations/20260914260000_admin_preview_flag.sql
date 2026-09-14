-- Admin-esikatselu: testipyynnöt ja -tarjoukset eivät näy muille eivätkä laukaise ilmoituksia.

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

COMMENT ON COLUMN public.projects.is_admin_preview IS
  'Admin-esikatselutilassa luotu testipyyntö — piilotettu julkisista listoista.';

COMMENT ON COLUMN public.bids.is_admin_preview IS
  'Admin-esikatselutilassa luotu testitarjous — piilotettu asiakkaalta.';
