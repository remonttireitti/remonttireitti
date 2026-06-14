-- Automaattinen tarjouspyynnön sulkeminen käyttämättömänä + varoitus asiakkaalle

alter table public.projects
  add column if not exists inactivity_warning_sent_at timestamptz,
  add column if not exists auto_closed_at timestamptz;

comment on column public.projects.inactivity_warning_sent_at is
  'Milloin asiakkaalle lähetettiin varoitus automaattisesta sulkemisesta';
comment on column public.projects.auto_closed_at is
  'Milloin tarjouspyyntö suljettiin automaattisesti käyttämättömänä';

create index if not exists projects_inactivity_warning_idx
  on public.projects (inactivity_warning_sent_at)
  where status in ('published', 'receiving_bids');

create index if not exists projects_auto_close_idx
  on public.projects (bid_deadline, published_at)
  where status in ('published', 'receiving_bids');
