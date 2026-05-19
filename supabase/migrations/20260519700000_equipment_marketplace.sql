-- Lämpöpumppujen markkinapaikka: kk-tilaus + ilmoitusmaksu (B2B), kuluttaja ilmaiseksi
-- Laskutus manuaalisesti (ei Stripeä) — awaiting_invoice → published

create type public.marketplace_seller_type as enum ('contractor', 'customer');

create type public.equipment_listing_condition as enum ('used', 'new');

create type public.equipment_listing_status as enum (
  'draft',
  'awaiting_invoice',
  'published',
  'expired',
  'removed'
);

create type public.marketplace_billing_kind as enum (
  'subscription',
  'listing',
  'listing_renewal'
);

create type public.marketplace_billing_status as enum (
  'pending',
  'invoiced',
  'paid',
  'cancelled'
);

create type public.seller_subscription_status as enum (
  'pending_invoice',
  'active',
  'past_due',
  'cancelled'
);

-- Hinnoittelupaketit (päivitä hinnat lib/marketplace-pricing.ts -teksteissä)
create table public.marketplace_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fi text not null,
  description_fi text,
  price_eur_cents int not null default 0,
  listing_quota_per_month int, -- null = ei kk-pakettia (esim. yksittäinen ilmoitus)
  is_monthly boolean not null default false,
  is_contractor_only boolean not null default true,
  is_active boolean not null default true,
  sort_order int not null default 0
);

insert into public.marketplace_plans (
  slug, name_fi, description_fi, price_eur_cents, listing_quota_per_month,
  is_monthly, is_contractor_only, sort_order
) values
  (
    'consumer_free',
    'Kuluttaja — ilmainen',
    'Käytetyt osat ja laitteet, max 2 aktiivista ilmoitusta',
    0,
    2,
    false,
    false,
    0
  ),
  (
    'contractor_basic',
    'Urakoitsija Perus',
    '3 aktiivista ilmoitusta / kk',
    4900,
    3,
    true,
    true,
    10
  ),
  (
    'contractor_pro',
    'Urakoitsija Pro',
    '10 aktiivista ilmoitusta / kk',
    9900,
    10,
    true,
    true,
    20
  ),
  (
    'listing_single',
    'Yksittäinen ilmoitus',
    '60 päivää, ilman kk-tilausta',
    2900,
    null,
    false,
    true,
    30
  )
on conflict (slug) do update set
  name_fi = excluded.name_fi,
  description_fi = excluded.description_fi,
  price_eur_cents = excluded.price_eur_cents,
  listing_quota_per_month = excluded.listing_quota_per_month,
  is_monthly = excluded.is_monthly,
  is_contractor_only = excluded.is_contractor_only,
  sort_order = excluded.sort_order;

-- Urakoitsijan kuukausitilaus
create table public.seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  plan_id uuid not null references public.marketplace_plans (id),
  status public.seller_subscription_status not null default 'pending_invoice',
  period_start date,
  period_end date,
  listings_published_this_period int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index seller_subscriptions_contractor_idx
  on public.seller_subscriptions (contractor_id);

-- Laitteiden / osien ilmoitukset
create table public.equipment_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  seller_type public.marketplace_seller_type not null,
  plan_id uuid references public.marketplace_plans (id),
  subscription_id uuid references public.seller_subscriptions (id) on delete set null,
  status public.equipment_listing_status not null default 'draft',
  condition public.equipment_listing_condition not null default 'used',
  title text not null,
  description text not null,
  price_eur int, -- pyöristetty euro; null = neuvotteleva
  municipality text not null,
  postal_code text not null,
  pump_type_slug text, -- ilmalampopumppu, maalampopumppu, ...
  manufacturer text,
  model text,
  year_manufactured int,
  contact_email text not null,
  contact_phone text not null,
  is_free_listing boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(title) >= 3),
  check (char_length(description) >= 10)
);

create index equipment_listings_status_idx on public.equipment_listings (status);
create index equipment_listings_seller_idx on public.equipment_listings (seller_id);
create index equipment_listings_published_idx
  on public.equipment_listings (published_at desc)
  where status = 'published';

-- Manuaalinen laskutusjono (sinä / kevyt yrittäjä)
create table public.marketplace_billing_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  kind public.marketplace_billing_kind not null,
  status public.marketplace_billing_status not null default 'pending',
  plan_id uuid references public.marketplace_plans (id),
  subscription_id uuid references public.seller_subscriptions (id) on delete set null,
  listing_id uuid references public.equipment_listings (id) on delete set null,
  amount_eur_cents int not null,
  description_fi text not null,
  invoice_reference text,
  invoiced_at timestamptz,
  paid_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);

create index marketplace_billing_pending_idx
  on public.marketplace_billing_requests (status)
  where status in ('pending', 'invoiced');

-- updated_at
create trigger seller_subscriptions_updated_at
  before update on public.seller_subscriptions
  for each row execute function public.set_updated_at();

create trigger equipment_listings_updated_at
  before update on public.equipment_listings
  for each row execute function public.set_updated_at();

-- RLS
alter table public.marketplace_plans enable row level security;
alter table public.seller_subscriptions enable row level security;
alter table public.equipment_listings enable row level security;
alter table public.marketplace_billing_requests enable row level security;

create policy "marketplace_plans: public read"
  on public.marketplace_plans for select
  using (is_active = true);

create policy "equipment_listings: public read published"
  on public.equipment_listings for select
  using (status = 'published');

create policy "equipment_listings: seller manage own"
  on public.equipment_listings for all
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

create policy "seller_subscriptions: contractor read own"
  on public.seller_subscriptions for select
  using (contractor_id = auth.uid());

create policy "seller_subscriptions: contractor insert own"
  on public.seller_subscriptions for insert
  with check (contractor_id = auth.uid());

create policy "marketplace_billing: seller read own"
  on public.marketplace_billing_requests for select
  using (seller_id = auth.uid());

create policy "marketplace_billing: seller insert own"
  on public.marketplace_billing_requests for insert
  with check (seller_id = auth.uid());

-- Admin hoitaa maksuja service role -kautta (createAdminClient)

comment on table public.equipment_listings is 'Käytetyt/uudet lämpöpumput ja osat; kuluttaja ilmainen, yritys kk/ilmoitus';
comment on table public.marketplace_billing_requests is 'Manuaalinen laskutusjono ilman Stripeä';
