-- Pieni apu (ajetaan kerran tuotannossa).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS help_postal_code text,
  ADD COLUMN IF NOT EXISTS help_municipality text,
  ADD COLUMN IF NOT EXISTS help_radius_km int NOT NULL DEFAULT 5
    CHECK (help_radius_km >= 1 AND help_radius_km <= 50),
  ADD COLUMN IF NOT EXISTS notify_nearby_help boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_voluntary_help boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_helps_given int NOT NULL DEFAULT 0
    CHECK (free_helps_given >= 0),
  ADD COLUMN IF NOT EXISTS free_helps_received int NOT NULL DEFAULT 0
    CHECK (free_helps_received >= 0);

COMMENT ON COLUMN public.profiles.help_postal_code IS 'Käyttäjän alue apuilmoituksia varten (ei julkinen tarkka osoite).';
COMMENT ON COLUMN public.profiles.notify_nearby_help IS 'Ilmoita kun lähellä tarvitaan vapaaehtoista apua.';
COMMENT ON COLUMN public.profiles.offer_voluntary_help IS 'Haluan tarjota vapaaehtoista apua lähialueella.';
COMMENT ON COLUMN public.profiles.free_helps_given IS 'Vahvistetut ilmaiset auttamiset (molemmat osapuolet kuittanneet).';

CREATE TABLE IF NOT EXISTS public.help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) >= 5),
  description text NOT NULL DEFAULT '' CHECK (char_length(trim(description)) >= 10),
  category text NOT NULL,
  postal_code text NOT NULL,
  municipality text NOT NULL,
  location_type text NOT NULL CHECK (location_type IN ('outdoor', 'common_area')),
  people_needed int NOT NULL DEFAULT 1 CHECK (people_needed >= 1 AND people_needed <= 10),
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'now')),
  window_start timestamptz,
  window_end timestamptz,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'matched', 'done', 'cancelled', 'expired')),
  accepted_offer_id uuid,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_requests_open_idx
  ON public.help_requests (status, expires_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS help_requests_requester_idx
  ON public.help_requests (requester_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.help_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.help_requests (id) ON DELETE CASCADE,
  helper_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  helper_kind text NOT NULL CHECK (helper_kind IN ('individual', 'company')),
  helper_display_name text NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, helper_id)
);

CREATE INDEX IF NOT EXISTS help_offers_request_idx
  ON public.help_offers (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS help_offers_helper_idx
  ON public.help_offers (helper_id, created_at DESC);

ALTER TABLE public.help_requests
  ADD CONSTRAINT help_requests_accepted_offer_fkey
  FOREIGN KEY (accepted_offer_id) REFERENCES public.help_offers (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.help_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.help_requests (id) ON DELETE CASCADE,
  offer_id uuid NOT NULL UNIQUE REFERENCES public.help_offers (id) ON DELETE CASCADE,
  helper_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  helper_confirmed_at timestamptz NOT NULL DEFAULT now(),
  requester_confirmed_at timestamptz,
  requester_rejected boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending_requester'
    CHECK (status IN ('pending_requester', 'confirmed', 'rejected', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_completions_requester_pending_idx
  ON public.help_completions (requester_id, status)
  WHERE status = 'pending_requester';

ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "help_requests: read open or own"
  ON public.help_requests FOR SELECT
  USING (
    auth.uid() = requester_id
    OR status IN ('open', 'matched', 'done')
  );

CREATE POLICY "help_requests: insert own"
  ON public.help_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "help_requests: update own"
  ON public.help_requests FOR UPDATE
  USING (auth.uid() = requester_id);

CREATE POLICY "help_offers: read if request visible"
  ON public.help_offers FOR SELECT
  USING (
    auth.uid() = helper_id
    OR EXISTS (
      SELECT 1 FROM public.help_requests hr
      WHERE hr.id = help_offers.request_id
        AND (hr.requester_id = auth.uid() OR hr.status IN ('open', 'matched', 'done'))
    )
  );

CREATE POLICY "help_offers: insert own"
  ON public.help_offers FOR INSERT
  WITH CHECK (auth.uid() = helper_id);

CREATE POLICY "help_offers: update helper or requester"
  ON public.help_offers FOR UPDATE
  USING (
    auth.uid() = helper_id
    OR EXISTS (
      SELECT 1 FROM public.help_requests hr
      WHERE hr.id = help_offers.request_id AND hr.requester_id = auth.uid()
    )
  );

CREATE POLICY "help_completions: read parties"
  ON public.help_completions FOR SELECT
  USING (auth.uid() = helper_id OR auth.uid() = requester_id);

CREATE POLICY "help_completions: insert helper"
  ON public.help_completions FOR INSERT
  WITH CHECK (auth.uid() = helper_id);

CREATE POLICY "help_completions: update parties"
  ON public.help_completions FOR UPDATE
  USING (auth.uid() = helper_id OR auth.uid() = requester_id);

CREATE TRIGGER help_requests_updated_at
  BEFORE UPDATE ON public.help_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER help_offers_updated_at
  BEFORE UPDATE ON public.help_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
