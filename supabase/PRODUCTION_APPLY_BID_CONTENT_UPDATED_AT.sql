-- Remonttireitti: aja KERRAN tuotanto-Supabasessa (SQL Editor → Run)

alter table public.bids
  add column if not exists content_updated_at timestamptz;

comment on column public.bids.content_updated_at is
  'Viimeisin tarjouksen sisällön päivitys (erillinen lähetysajasta).';
