-- Admin-hallinta oppiville ehdotuksille + tarjous/laskuri-poikkeamadata

alter table public.learned_proposals
  add column if not exists admin_status text not null default 'pending'
    check (admin_status in ('pending', 'approved', 'dismissed')),
  add column if not exists admin_note text,
  add column if not exists reviewed_at timestamptz;

create index if not exists learned_proposals_admin_status_idx
  on public.learned_proposals (admin_status, request_count desc);

comment on column public.learned_proposals.admin_status is
  'pending = odottaa, approved = hyväksytty näkyviin, dismissed = hylätty';

create table if not exists public.calculator_bid_deviations (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  job_slug text not null default 'generic',
  calculator_slug text,
  estimate_cents int not null check (estimate_cents > 0),
  bid_cents int not null check (bid_cents > 0),
  deviation_percent numeric(6, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists calculator_bid_deviations_job_idx
  on public.calculator_bid_deviations (job_slug, created_at desc);

create index if not exists calculator_bid_deviations_contractor_job_idx
  on public.calculator_bid_deviations (contractor_id, job_slug, created_at desc);

alter table public.calculator_bid_deviations enable row level security;

create policy "calc_deviations: contractor read own"
  on public.calculator_bid_deviations for select
  using (contractor_id = auth.uid());

create policy "calc_deviations: admin read all"
  on public.calculator_bid_deviations for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create or replace function public.set_learned_proposal_status(
  p_job_slug text,
  p_kind text,
  p_proposal_slug text,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('pending', 'approved', 'dismissed') then
    raise exception 'invalid status';
  end if;

  update public.learned_proposals
  set
    admin_status = p_status,
    admin_note = nullif(trim(p_note), ''),
    reviewed_at = now(),
    updated_at = now()
  where job_slug = p_job_slug
    and kind = p_kind
    and proposal_slug = p_proposal_slug;
end;
$$;

grant execute on function public.set_learned_proposal_status(text, text, text, text, text)
  to authenticated;

create or replace function public.record_calculator_bid_deviation(
  p_contractor_id uuid,
  p_project_id uuid,
  p_job_slug text,
  p_calculator_slug text,
  p_estimate_cents int,
  p_bid_cents int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  dev numeric(6, 2);
begin
  if p_estimate_cents is null or p_estimate_cents <= 0 then
    return;
  end if;
  if p_bid_cents is null or p_bid_cents <= 0 then
    return;
  end if;

  dev := round(
    ((p_bid_cents::numeric - p_estimate_cents::numeric) / p_estimate_cents::numeric) * 100,
    1
  );

  insert into public.calculator_bid_deviations (
    contractor_id,
    project_id,
    job_slug,
    calculator_slug,
    estimate_cents,
    bid_cents,
    deviation_percent
  )
  values (
    p_contractor_id,
    p_project_id,
    coalesce(nullif(trim(p_job_slug), ''), 'generic'),
    nullif(trim(p_calculator_slug), ''),
    p_estimate_cents,
    p_bid_cents,
    dev
  );
end;
$$;

grant execute on function public.record_calculator_bid_deviation(uuid, uuid, text, text, int, int)
  to authenticated;
