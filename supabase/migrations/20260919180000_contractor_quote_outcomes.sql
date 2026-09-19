-- Tulostettujen tarjousten tilauskuittaus (omille asiakkaille)

alter table public.contractor_quotes
  add column if not exists outcome text not null default 'pending'
    check (outcome in ('pending', 'won', 'lost')),
  add column if not exists outcome_updated_at timestamptz,
  add column if not exists remonttireitti_project_id uuid
    references public.projects (id) on delete set null;

create index if not exists contractor_quotes_outcome_idx
  on public.contractor_quotes (contractor_id, outcome);

comment on column public.contractor_quotes.outcome is
  'pending = ei tietoa, won = tilattu/voitetty, lost = ei tullut kaupaksi';
comment on column public.contractor_quotes.remonttireitti_project_id is
  'Linkitetty Remonttireitti-urakka, jos tarjous johti alustan kautta tulevaan työhön';
