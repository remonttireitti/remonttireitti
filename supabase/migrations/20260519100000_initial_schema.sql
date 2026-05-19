-- Remonttireitti: remonttivälityspalvelu (Urakkamaailma-tyyppinen, paremmin mallinnettu)

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type public.user_role as enum ('customer', 'contractor', 'admin');
create type public.project_status as enum (
  'draft',
  'published',
  'receiving_bids',
  'bid_accepted',
  'in_progress',
  'completed',
  'cancelled'
);
create type public.bid_status as enum ('draft', 'submitted', 'accepted', 'rejected', 'withdrawn');
create type public.verification_status as enum ('pending', 'verified', 'rejected');

-- Profiles (yksi rivi per auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Urakoitsijaprofiili
create table public.contractor_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  company_name text not null,
  business_id text, -- Y-tunnus
  description text,
  website_url text,
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  years_in_business int,
  employee_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Remonttityypit (hierarkia mahdollista myöhemmin parent_id:llä)
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fi text not null,
  description_fi text,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- Urakoitsijan tarjoamat kategoriat
create table public.contractor_categories (
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  category_id uuid not null references public.service_categories (id) on delete cascade,
  primary key (contractor_id, category_id)
);

-- Palvelualueet (postinumero tai kunta)
create table public.contractor_service_areas (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  postal_code text,
  municipality text not null,
  radius_km int default 30,
  unique (contractor_id, municipality, postal_code)
);

-- Remonttipyyntö / projekti
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.service_categories (id),
  title text not null,
  description text not null,
  status public.project_status not null default 'draft',
  -- Sijainti
  municipality text not null,
  postal_code text not null,
  address_line text, -- näytetään urakoitsijoille vasta hyväksynnän jälkeen
  -- Budjetti ja aikataulu
  budget_min int,
  budget_max int,
  desired_start date,
  flexibility_weeks int default 4,
  -- Strukturoitu data (kategoriakohtaiset kentät wizardista)
  details jsonb not null default '{}',
  -- Julkaisu
  published_at timestamptz,
  bid_deadline timestamptz,
  max_bids int default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_status_idx on public.projects (status);
create index projects_municipality_idx on public.projects (municipality);
create index projects_category_idx on public.projects (category_id);

-- Tarjoukset
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  status public.bid_status not null default 'draft',
  amount_cents int not null check (amount_cents > 0),
  vat_included boolean not null default true,
  estimated_days int,
  message text not null,
  valid_until date,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, contractor_id)
);

create index bids_project_idx on public.bids (project_id);

-- Keskusteluketju (projekti + osapuolet)
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, contractor_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- Arvostelut (vain valmistuneista projekteista)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  would_recommend boolean,
  created_at timestamptz not null default now(),
  unique (project_id, customer_id)
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger contractor_profiles_updated_at before update on public.contractor_profiles
  for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger bids_updated_at before update on public.bids
  for each row execute function public.set_updated_at();

-- Uusi käyttäjä → profiili
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed: yleisimmät remonttityypit
insert into public.service_categories (slug, name_fi, description_fi, sort_order) values
  ('keittio', 'Keittiöremontti', 'Keittiön uusiminen tai päivitys', 1),
  ('kylpyhuone', 'Kylpyhuoneremontti', 'Kylpyhuoneen ja wc:n remontti', 2),
  ('kylpyhuone-wc', 'Kylpyhuone ja wc', 'Yhdistetty kylpyhuone- ja wc-remontti', 3),
  ('sauna', 'Saunaremontti', 'Saunan rakentaminen tai uusiminen', 4),
  ('maalaus', 'Maalaus ja tapetointi', 'Sisä- ja ulkomaalaus', 5),
  ('lattia', 'Lattiat', 'Parketti, laatta, laminaatti', 6),
  ('katto', 'Kattoremontti', 'Katon korjaus tai uusiminen', 7),
  ('putki', 'Putkityöt', 'Putkiasennukset ja -korjaukset', 8),
  ('sahko', 'Sähkötyöt', 'Sähköasennukset ja -päivitykset', 9),
  ('julkisivu', 'Julkisivuremontti', 'Julkisivun korjaus ja maalaus', 10),
  ('huoneisto', 'Kokonaisremontti', 'Asunnon tai talon kokonaisremontti', 11),
  ('muu', 'Muu remontti', 'Muu remonttityyppi', 99);

-- RLS
alter table public.profiles enable row level security;
alter table public.contractor_profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.contractor_categories enable row level security;
alter table public.contractor_service_areas enable row level security;
alter table public.projects enable row level security;
alter table public.bids enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

-- Profiles
create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles: read public contractor names"
  on public.profiles for select
  using (
    exists (
      select 1 from public.contractor_profiles cp
      where cp.id = profiles.id and cp.verification_status = 'verified'
    )
  );

-- Categories: julkinen luku
create policy "categories: public read" on public.service_categories for select using (is_active = true);

-- Contractor profiles: julkinen luku vahvistetuille
create policy "contractors: public read verified"
  on public.contractor_profiles for select
  using (verification_status = 'verified');
create policy "contractors: manage own"
  on public.contractor_profiles for all
  using (auth.uid() = id);

-- Projects
create policy "projects: customer CRUD own"
  on public.projects for all
  using (auth.uid() = customer_id);
create policy "projects: contractors read published"
  on public.projects for select
  using (
    status in ('published', 'receiving_bids', 'bid_accepted', 'in_progress', 'completed')
    and exists (
      select 1 from public.contractor_profiles cp
      where cp.id = auth.uid()
    )
  );

-- Bids
create policy "bids: contractor manage own"
  on public.bids for all
  using (auth.uid() = contractor_id);
create policy "bids: customer read on own project"
  on public.bids for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id and pr.customer_id = auth.uid()
    )
  );

-- Messages: osallistujat
create policy "messages: participants read"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.customer_id = auth.uid() or c.contractor_id = auth.uid())
    )
  );
create policy "messages: participants insert"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.customer_id = auth.uid() or c.contractor_id = auth.uid())
    )
  );

-- Reviews: julkinen luku, asiakas luo omalle projektille
create policy "reviews: public read" on public.reviews for select using (true);
create policy "reviews: customer create for completed"
  on public.reviews for insert
  with check (
    auth.uid() = customer_id
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id and pr.customer_id = auth.uid() and pr.status = 'completed'
    )
  );
