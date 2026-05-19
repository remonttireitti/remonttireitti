-- Ammatit (urakoitsijan rekisteröityminen) + työt (asiakkaan pyyntö) + linkit

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fi text not null,
  description_fi text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.job_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fi text not null,
  description_fi text,
  search_keywords text[] not null default '{}',
  legacy_category_id uuid references public.service_categories (id),
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- Mitä ammatteja työ yleensä tarvitsee
create table public.job_type_trades (
  job_type_id uuid not null references public.job_types (id) on delete cascade,
  trade_id uuid not null references public.trades (id) on delete cascade,
  is_required boolean not null default true,
  primary key (job_type_id, trade_id)
);

-- Asiakkaan valitsemat ammatit pyynnössä
create table public.project_trades (
  project_id uuid not null references public.projects (id) on delete cascade,
  trade_id uuid not null references public.trades (id) on delete cascade,
  primary key (project_id, trade_id)
);

alter table public.projects
  add column if not exists job_type_id uuid references public.job_types (id);

create index if not exists projects_job_type_id_idx on public.projects (job_type_id);
create index if not exists job_types_search_keywords_gin on public.job_types using gin (search_keywords);

-- Urakoitsijan ammatit (rinnakkain contractor_categories)
create table public.contractor_trades (
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  trade_id uuid not null references public.trades (id) on delete cascade,
  primary key (contractor_id, trade_id)
);

-- RLS
alter table public.trades enable row level security;
alter table public.job_types enable row level security;
alter table public.job_type_trades enable row level security;
alter table public.project_trades enable row level security;
alter table public.contractor_trades enable row level security;

create policy "trades: public read"
  on public.trades for select using (is_active = true);

create policy "job_types: public read"
  on public.job_types for select using (is_active = true);

create policy "job_type_trades: public read"
  on public.job_type_trades for select using (true);

create policy "project_trades: customer manage own"
  on public.project_trades for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_trades.project_id and p.customer_id = auth.uid()
    )
  );

create policy "project_trades: contractors read on published"
  on public.project_trades for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_trades.project_id
        and p.status in ('published', 'receiving_bids', 'bid_accepted', 'in_progress', 'completed')
    )
  );

create policy "contractor_trades: manage own"
  on public.contractor_trades for all
  using (auth.uid() = contractor_id);

create policy "contractor_trades: public read"
  on public.contractor_trades for select using (true);

-- Seed: ammatit
insert into public.trades (slug, name_fi, description_fi, sort_order) values
  ('kirvesmies', 'Kirvesmies / timpuri', 'Rakennus- ja puutyöt, asennukset', 1),
  ('sahko', 'Sähköasentaja', 'Sähköasennukset ja -korjaukset', 2),
  ('putki', 'Putkiasentaja', 'LVI- ja putkityöt', 3),
  ('maalari', 'Maalari', 'Sisä- ja ulkomaalaus, tapetointi', 4),
  ('muurari', 'Muurari', 'Muuraus ja tiilityöt', 5),
  ('iv', 'IV-asentaja', 'Ilmanvaihto ja ilmastointi', 6),
  ('laatoitus', 'Laatoittaja', 'Laatoitus ja pinnoitus', 7),
  ('kattomies', 'Kattomies', 'Kattotyöt ja vesikate', 8),
  ('lattia', 'Lattiamies', 'Parketti, laminaatti, lattiat', 9),
  ('siivous', 'Siivous', 'Rakennussiivous ja loppusiivous', 10),
  ('kuljetus', 'Kuljetus', 'Tavarankuljetus ja nosto', 11),
  ('purku', 'Purku', 'Purkutyöt ja jätehuolto', 12);

-- Seed: työt (legacy_category_id linkitetään olemassa oleviin kategorioihin)
insert into public.job_types (slug, name_fi, description_fi, search_keywords, legacy_category_id, sort_order)
select
  v.slug,
  v.name_fi,
  v.description_fi,
  v.search_keywords,
  sc.id,
  v.sort_order
from (values
  ('keittio-asennus', 'Keittiön asennus tai uusiminen', 'Keittiökaapit, tasot, kodinkoneet', array['keittiö','keittio','keittiöremontti','kaapistot'], 'keittio', 1),
  ('kylpyhuone-remontti', 'Kylpyhuoneremontti', 'Kylpyhuone ja wc kokonaisuudessaan', array['kylpyhuone','kylpy','wc','pesuhuone'], 'kylpyhuone', 2),
  ('sauna-remontti', 'Saunaremontti', 'Saunan rakentaminen tai uusiminen', array['sauna','saunaremontti'], 'sauna', 3),
  ('lampopumppu', 'Lämpöpumpun asennus', 'Vesi-ilmalämpöpumppu tai ilmalämpöpumppu', array['lämpöpumppu','lampopumppu','ilmalämpöpumppu','vesilämpöpumppu','ilmavesilämpöpumppu'], 'muu', 10),
  ('ilmanvaihto', 'Ilmanvaihtokoneen asennus', 'IV-kone, kanavisto, ilmanvaihto', array['ilmanvaihto','iv','iv-kone','kanavisto'], 'muu', 11),
  ('sahko-korjaus', 'Sähkötyöt', 'Pistorasiat, valaistus, sähkökeskus', array['sähkö','sahko','pistorasia','valaistus'], 'sahko', 12),
  ('putki-korjaus', 'Putkityöt', 'Vuotavat putket, viemärit, lämmitysputket', array['putki','putkivuoto','viemäri','lvi'], 'putki', 13),
  ('maalaus', 'Maalaus ja tapetointi', 'Seinät, katot, ulkomaalaus', array['maalaus','maalari','tapetointi'], 'maalaus', 14),
  ('lattia', 'Lattian asennus', 'Parketti, laminaatti, laatta', array['lattia','parketti','laminaatti','laatta'], 'lattia', 15),
  ('katto', 'Kattoremontti', 'Katon korjaus, vesikate, kattoremontti', array['katto','kattoremontti','vesikate'], 'katto', 16),
  ('julkisivu', 'Julkisivuremontti', 'Julkisivu, maalaus, verhous', array['julkisivu','ulko','verhous'], 'julkisivu', 17),
  ('kokonaisremontti', 'Kokonaisremontti', 'Asunnon tai talon laaja remontti', array['kokonaisremontti','remontti','asunto'], 'huoneisto', 18),
  ('muu', 'Muu työ', 'Muu remontti- tai asennustyö', array['muu','remontti'], 'muu', 99)
) as v(slug, name_fi, description_fi, search_keywords, legacy_slug, sort_order)
join public.service_categories sc on sc.slug = v.legacy_slug;

-- Työ → suositellut ammatit
insert into public.job_type_trades (job_type_id, trade_id, is_required)
select jt.id, t.id, v.req
from (values
  ('keittio-asennus', 'kirvesmies', true),
  ('keittio-asennus', 'putki', true),
  ('keittio-asennus', 'sahko', true),
  ('keittio-asennus', 'maalari', false),
  ('keittio-asennus', 'laatoitus', false),
  ('kylpyhuone-remontti', 'putki', true),
  ('kylpyhuone-remontti', 'sahko', true),
  ('kylpyhuone-remontti', 'laatoitus', true),
  ('kylpyhuone-remontti', 'maalari', false),
  ('sauna-remontti', 'putki', true),
  ('sauna-remontti', 'sahko', true),
  ('sauna-remontti', 'kirvesmies', true),
  ('lampopumppu', 'sahko', true),
  ('lampopumppu', 'putki', true),
  ('ilmanvaihto', 'iv', true),
  ('ilmanvaihto', 'sahko', false),
  ('sahko-korjaus', 'sahko', true),
  ('putki-korjaus', 'putki', true),
  ('maalaus', 'maalari', true),
  ('lattia', 'lattia', true),
  ('katto', 'kattomies', true),
  ('julkisivu', 'maalari', true),
  ('julkisivu', 'muurari', false),
  ('kokonaisremontti', 'kirvesmies', true),
  ('kokonaisremontti', 'putki', false),
  ('kokonaisremontti', 'sahko', false),
  ('kokonaisremontti', 'maalari', false)
) as v(jt_slug, trade_slug, req)
join public.job_types jt on jt.slug = v.jt_slug
join public.trades t on t.slug = v.trade_slug
on conflict do nothing;
