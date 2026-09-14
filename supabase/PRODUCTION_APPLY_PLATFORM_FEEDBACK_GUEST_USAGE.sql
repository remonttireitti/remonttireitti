-- Vieraspalautteen selvitys: käyttö vs. selaus (ajetaan tuotannossa kerran).

CREATE TYPE public.platform_feedback_guest_usage AS ENUM (
  'used_service',
  'browsed_only'
);

ALTER TABLE public.platform_feedback
  ADD COLUMN IF NOT EXISTS guest_usage_context public.platform_feedback_guest_usage;

COMMENT ON COLUMN public.platform_feedback.guest_usage_context IS
  'Vieraskäyttäjän yleispalautteessa: käyttikö palvelua vai selasiko vain sivustoa.';
