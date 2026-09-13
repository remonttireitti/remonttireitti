-- Laajenna arvioijaoikeudet kaikkiin tarjouspyyntöalueisiin

ALTER TABLE public.evaluator_scopes
  DROP CONSTRAINT IF EXISTS evaluator_scopes_scope_check;

ALTER TABLE public.bid_evaluation_requests
  DROP CONSTRAINT IF EXISTS bid_evaluation_requests_category_check;

UPDATE public.evaluator_scopes
SET scope = 'lammitys'
WHERE scope = 'heat_pump';

CREATE OR REPLACE FUNCTION public.evaluator_can_review_category(p_category text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_user()
    OR (
      public.is_evaluator_user()
      AND EXISTS (
        SELECT 1 FROM public.evaluator_scopes es
        WHERE es.evaluator_id = auth.uid()
          AND (
            es.scope = p_category
            OR (es.scope = 'heat_pump' AND p_category IN ('heat_pump', 'lammitys'))
            OR (
              es.scope = 'general'
              AND p_category IN (
                'general',
                'puulammitys',
                'sahko-energia',
                'lvi-ilma',
                'sisatilat',
                'ulkokuori',
                'perustus-runko',
                'piha',
                'palvelut'
              )
            )
          )
      )
    );
$$;

COMMENT ON TABLE public.evaluator_scopes IS
  'Arvioijan oikeudet tarjouspyyntöalueittain (PROJECT_AREAS.slug). Vanhat heat_pump/general tuettu SQL-funktiossa.';
