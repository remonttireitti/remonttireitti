-- Oppivat lisäehdotukset ja puuttuvat tiedot (kategoriakohtaiset, ei yksittäisen urakoitsijan mielipide)
create table if not exists public.learned_proposals (
  job_slug text not null,
  proposal_slug text not null,
  kind text not null check (kind in ('addon', 'info_need')),
  label text not null,
  request_count int not null default 1 check (request_count >= 0),
  suggestion_count int not null default 0 check (suggestion_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (job_slug, kind, proposal_slug)
);

create index if not exists learned_proposals_job_kind_count_idx
  on public.learned_proposals (job_slug, kind, request_count desc);

comment on table public.learned_proposals is
  'Toistuvat urakoitsija-/asiakasehdotukset työlajeittain. Yksittäinen ehdotus ei muuta laskuria — vain toistuvuus.';

alter table public.learned_proposals enable row level security;

create policy "learned_proposals: public read"
  on public.learned_proposals for select
  using (true);

create or replace function public.increment_learned_proposal(
  p_job_slug text,
  p_kind text,
  p_label text,
  p_as_suggestion boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  slug text;
begin
  if p_job_slug is null or p_job_slug = '' then
    p_job_slug := 'generic';
  end if;
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
    p_job_slug,
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
end;
$$;

grant execute on function public.increment_learned_proposal(text, text, text, boolean)
  to authenticated;
