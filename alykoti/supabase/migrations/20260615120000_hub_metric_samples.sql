-- Mittarihistoria trendeille (lämpötilat, nopeudet, tilat).

create table public.hub_metric_samples (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs (id) on delete cascade,
  metric text not null,
  value numeric,
  value_text text,
  recorded_at timestamptz not null default now()
);

create index hub_metric_samples_lookup_idx
  on public.hub_metric_samples (hub_id, metric, recorded_at desc);

alter table public.hub_metric_samples enable row level security;

create policy "hub_metric_samples: user read own hub"
  on public.hub_metric_samples for select
  using (
    hub_id in (select id from public.hubs where user_id = auth.uid())
  );

comment on table public.hub_metric_samples is 'Aikasarjanäytteet ilmanvaihdon trendeille.';
