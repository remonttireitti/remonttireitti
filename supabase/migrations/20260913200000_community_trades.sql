-- Yhteisön lisäämät ammatit (urakoitsija ehdottaa rekisteröityessä).

alter table public.trades
  add column if not exists source text not null default 'seed';

alter table public.trades
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

alter table public.trades
  drop constraint if exists trades_source_check;

alter table public.trades
  add constraint trades_source_check
  check (source in ('seed', 'community'));

create index if not exists trades_source_idx on public.trades (source);

comment on column public.trades.source is
  'seed = oletusvalikoima, community = käyttäjien ehdottama ammatti';

comment on column public.trades.created_by is
  'Ensimmäinen urakoitsija joka ehdotti community-ammattia';
