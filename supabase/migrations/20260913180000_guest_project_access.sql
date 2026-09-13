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
