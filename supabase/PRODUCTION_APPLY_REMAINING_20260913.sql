-- Remonttireitti: aja tuotanto-Supabasessa JOS isompi PRODUCTION_APPLY_20260913.sql
-- kaatui virheeseen "type bid_evaluation_status already exists".
--
-- Tämä tarkoittaa että aiemmat migraatiot (100000–180000) on jo ajettu.
-- Tässä tiedostossa vain puuttuvat osat tarjousten tallennukseen ja community-ammatteihin.
-- Kaikki komennot ovat idempotentteja (IF NOT EXISTS).

-- ========== 20260913190000_bid_trade_scope.sql ==========

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS offered_trade_ids uuid[] DEFAULT NULL;

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS turnkey_coordination text;

ALTER TABLE public.bids
  DROP CONSTRAINT IF EXISTS bids_turnkey_coordination_check;

ALTER TABLE public.bids
  ADD CONSTRAINT bids_turnkey_coordination_check
  CHECK (
    turnkey_coordination IS NULL
    OR turnkey_coordination IN ('subcontract', 'customer_sources')
  );

COMMENT ON COLUMN public.bids.offered_trade_ids IS
  'Urakoitsijan tarjoamat ammatit (own_trade). Tyhjä = kaikki omat osumat.';

COMMENT ON COLUMN public.bids.turnkey_coordination IS
  'turnkey: subcontract = alihankkijat, customer_sources = asiakas hankkii puuttuvat.';


-- ========== 20260913200000_community_trades.sql ==========

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'seed';

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_source_check;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_source_check
  CHECK (source IN ('seed', 'community'));

CREATE INDEX IF NOT EXISTS trades_source_idx ON public.trades (source);

COMMENT ON COLUMN public.trades.source IS
  'seed = oletusvalikoima, community = käyttäjien ehdottama ammatti';

COMMENT ON COLUMN public.trades.created_by IS
  'Ensimmäinen urakoitsija joka ehdottaa community-ammattia';
