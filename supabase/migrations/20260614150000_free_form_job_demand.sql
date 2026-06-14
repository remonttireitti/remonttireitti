-- Vapaa tarjouspyyntö + kysyntätilastot (mitä työtyyppejä pyydetään usein).

insert into public.job_types (slug, name_fi, description_fi, search_keywords, legacy_category_id, sort_order, is_active)
select
  'vapaa-pyynto',
  'Muu remontti — kuvaile itse',
  'Työtä ei löydy listalta? Kerro omin sanoin mitä tarvitset.',
  array['muu','vapaa','en tiedä','en löydy','custom','muu remontti'],
  sc.id,
  999,
  true
from public.service_categories sc
where sc.slug = 'muu'
on conflict (slug) do update set
  name_fi = excluded.name_fi,
  description_fi = excluded.description_fi,
  search_keywords = excluded.search_keywords,
  legacy_category_id = excluded.legacy_category_id,
  sort_order = excluded.sort_order,
  is_active = true;

create table if not exists public.job_demand_signals (
  normalized_key text primary key,
  sample_label text not null,
  project_count integer not null default 0 check (project_count >= 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_project_id uuid references public.projects (id) on delete set null
);

comment on table public.job_demand_signals is
  'Vapaamuotoisten pyyntöjen kysyntä — uudet tyypit katalogiin kun project_count kasvaa.';

alter table public.job_demand_signals enable row level security;

create or replace function public.record_job_demand_signal(
  p_label text,
  p_project_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_label text;
begin
  v_label := trim(coalesce(p_label, ''));
  if length(v_label) < 3 then
    return;
  end if;

  v_key := lower(
    regexp_replace(
      translate(v_label, 'äåöÄÅÖ', 'aaooaaoo'),
      '\s+',
      ' ',
      'g'
    )
  );

  if length(v_key) < 3 then
    return;
  end if;

  insert into public.job_demand_signals (
    normalized_key,
    sample_label,
    project_count,
    last_project_id
  )
  values (v_key, v_label, 1, p_project_id)
  on conflict (normalized_key) do update set
    project_count = job_demand_signals.project_count + 1,
    sample_label = excluded.sample_label,
    last_seen_at = now(),
    last_project_id = excluded.last_project_id;
end;
$$;

revoke all on function public.record_job_demand_signal(text, uuid) from public;
grant execute on function public.record_job_demand_signal(text, uuid) to authenticated;
