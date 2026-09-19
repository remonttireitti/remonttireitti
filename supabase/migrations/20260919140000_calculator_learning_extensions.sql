-- Oppimisen laajennukset: 30 % auto-hyväksyntä, valmiit urakat, dynaamiset haarukat

-- Uniikit ehdottajat per ehdotus (30 % -kynnys)
create table if not exists public.learned_proposal_suggesters (
  job_slug text not null,
  kind text not null check (kind in ('addon', 'info_need')),
  proposal_slug text not null,
  contractor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_slug, kind, proposal_slug, contractor_id)
);

create index if not exists learned_proposal_suggesters_job_idx
  on public.learned_proposal_suggesters (job_slug, contractor_id);

-- Urakoitsijat, jotka ovat käyttäneet laskuria / ehdottaneet tälle työlajille
create table if not exists public.job_learning_activity (
  job_slug text not null,
  contractor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_slug, contractor_id)
);

alter table public.learned_proposal_suggesters enable row level security;
alter table public.job_learning_activity enable row level security;

create policy "learned_suggesters: admin read"
  on public.learned_proposal_suggesters for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "job_learning_activity: admin read"
  on public.job_learning_activity for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Valmiiden urakoiden toteutuneet hinnat (oppiva haarukka)
create table if not exists public.calculator_completed_outcomes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  job_slug text not null default 'generic',
  calculator_slug text,
  estimate_cents int not null check (estimate_cents > 0),
  final_cents int not null check (final_cents > 0),
  primary_qty numeric(10, 2),
  created_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists calculator_completed_outcomes_job_idx
  on public.calculator_completed_outcomes (job_slug, created_at desc);

create index if not exists calculator_completed_outcomes_calc_idx
  on public.calculator_completed_outcomes (calculator_slug, created_at desc);

alter table public.calculator_completed_outcomes enable row level security;

create policy "calc_completed: admin read"
  on public.calculator_completed_outcomes for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Oppivat hintahaarukat laskureille
create table if not exists public.calculator_learned_ranges (
  calculator_slug text primary key,
  job_slug text not null default 'generic',
  low_multiplier numeric(6, 4) not null,
  high_multiplier numeric(6, 4) not null,
  median_deviation_percent numeric(6, 2) not null default 0,
  sample_count int not null default 0 check (sample_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.calculator_learned_ranges enable row level security;

create policy "calc_learned_ranges: public read"
  on public.calculator_learned_ranges for select
  using (true);

-- Päivitetty increment: seuraa urakoitsijoita + auto-hyväksyntä ≥ 30 %
create or replace function public.increment_learned_proposal(
  p_job_slug text,
  p_kind text,
  p_label text,
  p_as_suggestion boolean default false,
  p_contractor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  slug text;
  v_job_slug text;
  v_unique_proposal int;
  v_unique_job int;
  v_share numeric;
  v_auto_note text := 'Automaattinen hyväksyntä (≥30 % urakoitsijoista ehdotti samaa)';
begin
  v_job_slug := coalesce(nullif(trim(p_job_slug), ''), 'generic');

  if p_label is null or trim(p_label) = '' then
    return;
  end if;
  if p_kind not in ('addon', 'info_need') then
    return;
  end if;

  slug := lower(
    regexp_replace(
      regexp_replace(
        trim(p_label),
        '[^a-zA-Z0-9äöåÄÖÅ]+',
        '-',
        'g'
      ),
      '(^-|-$)',
      '',
      'g'
    )
  );
  if slug = '' then
    slug := 'item';
  end if;

  insert into public.learned_proposals (
    job_slug,
    proposal_slug,
    kind,
    label,
    request_count,
    suggestion_count
  )
  values (
    v_job_slug,
    slug,
    p_kind,
    trim(p_label),
    1,
    case when p_as_suggestion then 1 else 0 end
  )
  on conflict (job_slug, kind, proposal_slug)
  do update set
    label = excluded.label,
    request_count = learned_proposals.request_count + 1,
    suggestion_count = learned_proposals.suggestion_count
      + case when p_as_suggestion then 1 else 0 end,
    updated_at = now();

  if p_contractor_id is not null and p_as_suggestion then
    insert into public.job_learning_activity (job_slug, contractor_id)
    values (v_job_slug, p_contractor_id)
    on conflict do nothing;

    insert into public.learned_proposal_suggesters (
      job_slug, kind, proposal_slug, contractor_id
    )
    values (v_job_slug, p_kind, slug, p_contractor_id)
    on conflict do nothing;

    select count(*)::int into v_unique_proposal
    from public.learned_proposal_suggesters
    where job_slug = v_job_slug
      and kind = p_kind
      and proposal_slug = slug;

    select count(*)::int into v_unique_job
    from public.job_learning_activity
    where job_slug = v_job_slug;

    if v_unique_job >= 5 and v_unique_proposal >= 3 then
      v_share := v_unique_proposal::numeric / v_unique_job::numeric;
      if v_share >= 0.30 then
        update public.learned_proposals
        set
          admin_status = 'approved',
          admin_note = v_auto_note,
          reviewed_at = now(),
          updated_at = now()
        where job_slug = v_job_slug
          and kind = p_kind
          and proposal_slug = slug
          and admin_status = 'pending';
      end if;
    end if;
  end if;
end;
$$;

grant execute on function public.increment_learned_proposal(text, text, text, boolean, uuid)
  to authenticated;

create or replace function public.record_calculator_completed_outcome(
  p_project_id uuid,
  p_job_slug text,
  p_calculator_slug text,
  p_estimate_cents int,
  p_final_cents int,
  p_primary_qty numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_estimate_cents is null or p_estimate_cents <= 0 then
    return;
  end if;
  if p_final_cents is null or p_final_cents <= 0 then
    return;
  end if;

  insert into public.calculator_completed_outcomes (
    project_id,
    job_slug,
    calculator_slug,
    estimate_cents,
    final_cents,
    primary_qty
  )
  values (
    p_project_id,
    coalesce(nullif(trim(p_job_slug), ''), 'generic'),
    nullif(trim(p_calculator_slug), ''),
    p_estimate_cents,
    p_final_cents,
    p_primary_qty
  )
  on conflict (project_id) do update set
    final_cents = excluded.final_cents,
    estimate_cents = excluded.estimate_cents,
    primary_qty = excluded.primary_qty;
end;
$$;

grant execute on function public.record_calculator_completed_outcome(uuid, text, text, int, int, numeric)
  to authenticated;

create or replace function public.recompute_calculator_learned_range(
  p_calculator_slug text,
  p_job_slug text default 'generic'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_job text;
  v_deviations numeric[];
  v_median numeric;
  v_p25 numeric;
  v_p75 numeric;
  v_n int;
  v_factor numeric;
  v_low numeric;
  v_high numeric;
begin
  v_slug := nullif(trim(p_calculator_slug), '');
  v_job := coalesce(nullif(trim(p_job_slug), ''), 'generic');
  if v_slug is null then
    return;
  end if;

  select array_agg(dev order by dev)
  into v_deviations
  from (
    select
      ((final_cents::numeric - estimate_cents::numeric) / estimate_cents::numeric) * 100 as dev
    from public.calculator_completed_outcomes
    where calculator_slug = v_slug
    union all
    select deviation_percent::numeric as dev
    from public.calculator_bid_deviations
    where calculator_slug = v_slug
  ) combined;

  v_n := coalesce(array_length(v_deviations, 1), 0);
  if v_n < 5 then
    return;
  end if;

  v_median := v_deviations[1 + (v_n / 2)];
  v_p25 := v_deviations[1 + (v_n * 0.25)::int];
  v_p75 := v_deviations[1 + (v_n * 0.75)::int];

  v_factor := 1 + (v_median / 100);
  v_low := greatest(0.5, least(1.2, 0.9 * v_factor + (v_p25 - v_median) / 500));
  v_high := greatest(0.8, least(2.0, 1.15 * v_factor + (v_p75 - v_median) / 500));

  insert into public.calculator_learned_ranges (
    calculator_slug,
    job_slug,
    low_multiplier,
    high_multiplier,
    median_deviation_percent,
    sample_count,
    updated_at
  )
  values (
    v_slug,
    v_job,
    round(v_low, 4),
    round(v_high, 4),
    round(v_median, 1),
    v_n,
    now()
  )
  on conflict (calculator_slug) do update set
    job_slug = excluded.job_slug,
    low_multiplier = excluded.low_multiplier,
    high_multiplier = excluded.high_multiplier,
    median_deviation_percent = excluded.median_deviation_percent,
    sample_count = excluded.sample_count,
    updated_at = now();
end;
$$;

grant execute on function public.recompute_calculator_learned_range(text, text)
  to authenticated;
