-- Tarjouskilpailun kuukausitilaus (manuaalinen laskutus)

alter table public.contractor_profiles
  add column if not exists platform_subscription_until timestamptz;

comment on column public.contractor_profiles.platform_subscription_until is
  'Voimassa oleva kuukausitilaus — per-diili -palkkio 0 € kun > now()';

create table if not exists public.platform_billing_requests (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  period_slug text not null,
  subscription_months int not null check (subscription_months > 0),
  status text not null default 'pending'
    check (status in ('pending', 'invoiced', 'paid', 'cancelled')),
  amount_eur_cents int not null check (amount_eur_cents >= 0),
  description_fi text not null,
  invoice_reference text,
  invoiced_at timestamptz,
  paid_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);

create index if not exists platform_billing_pending_idx
  on public.platform_billing_requests (status, created_at)
  where status in ('pending', 'invoiced');

alter table public.platform_billing_requests enable row level security;

drop policy if exists "platform_billing: contractor read own" on public.platform_billing_requests;
create policy "platform_billing: contractor read own"
  on public.platform_billing_requests for select
  using (contractor_id = auth.uid());

drop policy if exists "platform_billing: contractor insert own" on public.platform_billing_requests;
create policy "platform_billing: contractor insert own"
  on public.platform_billing_requests for insert
  with check (contractor_id = auth.uid());

comment on table public.platform_billing_requests is
  'Tarjouskilpailun kuukausitilauksen laskutusjono (manuaalinen)';
