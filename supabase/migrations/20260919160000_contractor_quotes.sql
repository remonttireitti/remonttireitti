-- Urakoitsijan itsenäiset tarjoukset (Remonttireitin ulkopuolinen käyttö)

create table if not exists public.contractor_quotes (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  calculator_slug text not null,
  job_slug text,
  title text not null,
  client_name text,
  client_email text,
  site_municipality text,
  site_address text,
  primary_qty numeric(10, 2),
  line_items jsonb not null default '[]'::jsonb,
  scope_lines jsonb not null default '[]'::jsonb,
  subtotal_cents int not null check (subtotal_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  margin_percent numeric(5, 2) not null default 0,
  cost_breakdown jsonb,
  profitability_summary jsonb,
  vat_included boolean not null default true,
  notes text,
  status text not null default 'draft'
    check (status in ('draft', 'finalized')),
  pdf_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contractor_quotes_contractor_created_idx
  on public.contractor_quotes (contractor_id, created_at desc);

create table if not exists public.contractor_quote_pdf_exports (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractor_profiles (id) on delete cascade,
  quote_id uuid not null references public.contractor_quotes (id) on delete cascade,
  exported_at timestamptz not null default now()
);

create index if not exists contractor_quote_pdf_exports_month_idx
  on public.contractor_quote_pdf_exports (contractor_id, exported_at desc);

alter table public.contractor_quotes enable row level security;
alter table public.contractor_quote_pdf_exports enable row level security;

create policy "contractor_quotes: own"
  on public.contractor_quotes for all
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());

create policy "contractor_quote_pdf_exports: own"
  on public.contractor_quote_pdf_exports for all
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());

create policy "contractor_quote_pdf_exports: admin read"
  on public.contractor_quote_pdf_exports for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
