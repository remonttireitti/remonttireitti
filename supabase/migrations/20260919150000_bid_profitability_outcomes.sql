-- Urakoitsijan tarjouskannattavuus: arvio tarjouksessa + toteuma valmiissa urakassa

create table if not exists public.bid_profitability_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contractor_id uuid not null references public.profiles (id) on delete cascade,
  bid_id uuid references public.bids (id) on delete set null,
  selling_price_cents int not null check (selling_price_cents >= 0),
  material_cents int not null default 0 check (material_cents >= 0),
  labor_cents int not null default 0 check (labor_cents >= 0),
  subcontract_cents int not null default 0 check (subcontract_cents >= 0),
  travel_cents int not null default 0 check (travel_cents >= 0),
  other_cents int not null default 0 check (other_cents >= 0),
  estimated_profit_cents int not null default 0,
  estimated_margin_percent numeric(6, 2) not null default 0,
  estimated_hours numeric(8, 2),
  created_at timestamptz not null default now(),
  unique (project_id, contractor_id)
);

create table if not exists public.bid_profitability_outcomes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contractor_id uuid not null references public.profiles (id) on delete cascade,
  bid_cents int not null check (bid_cents > 0),
  estimated_cost_cents int not null check (estimated_cost_cents >= 0),
  actual_cost_cents int not null check (actual_cost_cents >= 0),
  actual_profit_cents int not null,
  notes text,
  reported_at timestamptz not null default now(),
  unique (project_id)
);

alter table public.bid_profitability_plans enable row level security;
alter table public.bid_profitability_outcomes enable row level security;

create policy "profitability_plans: contractor own"
  on public.bid_profitability_plans for all
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());

create policy "profitability_outcomes: contractor own"
  on public.bid_profitability_outcomes for all
  using (contractor_id = auth.uid())
  with check (contractor_id = auth.uid());

create policy "profitability_outcomes: admin read"
  on public.bid_profitability_outcomes for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create or replace function public.upsert_bid_profitability_plan(
  p_project_id uuid,
  p_contractor_id uuid,
  p_bid_id uuid,
  p_selling_price_cents int,
  p_material_cents int,
  p_labor_cents int,
  p_subcontract_cents int,
  p_travel_cents int,
  p_other_cents int,
  p_estimated_profit_cents int,
  p_estimated_margin_percent numeric,
  p_estimated_hours numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.bid_profitability_plans (
    project_id,
    contractor_id,
    bid_id,
    selling_price_cents,
    material_cents,
    labor_cents,
    subcontract_cents,
    travel_cents,
    other_cents,
    estimated_profit_cents,
    estimated_margin_percent,
    estimated_hours
  )
  values (
    p_project_id,
    p_contractor_id,
    p_bid_id,
    p_selling_price_cents,
    coalesce(p_material_cents, 0),
    coalesce(p_labor_cents, 0),
    coalesce(p_subcontract_cents, 0),
    coalesce(p_travel_cents, 0),
    coalesce(p_other_cents, 0),
    coalesce(p_estimated_profit_cents, 0),
    coalesce(p_estimated_margin_percent, 0),
    p_estimated_hours
  )
  on conflict (project_id, contractor_id) do update set
    bid_id = excluded.bid_id,
    selling_price_cents = excluded.selling_price_cents,
    material_cents = excluded.material_cents,
    labor_cents = excluded.labor_cents,
    subcontract_cents = excluded.subcontract_cents,
    travel_cents = excluded.travel_cents,
    other_cents = excluded.other_cents,
    estimated_profit_cents = excluded.estimated_profit_cents,
    estimated_margin_percent = excluded.estimated_margin_percent,
    estimated_hours = excluded.estimated_hours;
end;
$$;

grant execute on function public.upsert_bid_profitability_plan(uuid, uuid, uuid, int, int, int, int, int, int, int, numeric, numeric)
  to authenticated;

create or replace function public.record_bid_profitability_outcome(
  p_project_id uuid,
  p_contractor_id uuid,
  p_bid_cents int,
  p_estimated_cost_cents int,
  p_actual_cost_cents int,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profit int;
begin
  v_profit := p_bid_cents - p_actual_cost_cents;

  insert into public.bid_profitability_outcomes (
    project_id,
    contractor_id,
    bid_cents,
    estimated_cost_cents,
    actual_cost_cents,
    actual_profit_cents,
    notes
  )
  values (
    p_project_id,
    p_contractor_id,
    p_bid_cents,
    p_estimated_cost_cents,
    p_actual_cost_cents,
    v_profit,
    nullif(trim(p_notes), '')
  )
  on conflict (project_id) do update set
    bid_cents = excluded.bid_cents,
    estimated_cost_cents = excluded.estimated_cost_cents,
    actual_cost_cents = excluded.actual_cost_cents,
    actual_profit_cents = excluded.actual_profit_cents,
    notes = excluded.notes,
    reported_at = now();
end;
$$;

grant execute on function public.record_bid_profitability_outcome(uuid, uuid, int, int, int, text)
  to authenticated;
