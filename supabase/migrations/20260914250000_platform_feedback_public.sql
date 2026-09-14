-- Julkinen palaute: vieraskäyttäjät, sähköpostivahvistus, yksi yleispalaute per sähköposti.

ALTER TABLE public.platform_feedback
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.platform_feedback
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_token_hash text;

ALTER TABLE public.platform_feedback
  DROP CONSTRAINT IF EXISTS platform_feedback_identity_check;

ALTER TABLE public.platform_feedback
  ADD CONSTRAINT platform_feedback_identity_check
  CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS platform_feedback_user_general_uidx
  ON public.platform_feedback (user_id)
  WHERE context = 'general' AND project_id IS NULL AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS platform_feedback_guest_email_general_uidx
  ON public.platform_feedback (lower(guest_email))
  WHERE context = 'general' AND project_id IS NULL AND guest_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_feedback_verified_general_idx
  ON public.platform_feedback (created_at DESC)
  WHERE context = 'general'
    AND (user_id IS NOT NULL OR email_verified_at IS NOT NULL);

COMMENT ON COLUMN public.platform_feedback.guest_email IS
  'Vieraskäyttäjän sähköposti — yksi yleispalaute per osoite vahvistuksen jälkeen.';

CREATE TABLE IF NOT EXISTS public.platform_feedback_support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.platform_feedback (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  guest_email text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_feedback_support_created_idx
  ON public.platform_feedback_support_requests (created_at DESC);

ALTER TABLE public.platform_feedback_support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_feedback_support: insert own feedback"
  ON public.platform_feedback_support_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_feedback pf
      WHERE pf.id = feedback_id
        AND (
          pf.user_id = auth.uid()
          OR (
            pf.guest_email IS NOT NULL
            AND lower(pf.guest_email) = lower(coalesce(guest_email, ''))
          )
        )
    )
  );

CREATE POLICY "platform_feedback_support: admin read"
  ON public.platform_feedback_support_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );
