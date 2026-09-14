-- Tarjouksen sisällön viimeisin muokkausaika (tapahtumaloki)

alter table public.bids
  add column if not exists content_updated_at timestamptz;

comment on column public.bids.content_updated_at is
  'Viimeisin tarjouksen sisällön päivitys (erillinen lähetysajasta).';
