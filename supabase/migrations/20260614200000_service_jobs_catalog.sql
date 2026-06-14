-- Palvelut & kunnossapito: siivous, muutto, piha, pesut jne.

insert into public.trades (slug, name_fi, description_fi, sort_order) values
  ('siivous', 'Siivouspalvelu', 'Kotisiivous, ikkunanpesu, loppusiivous', 19),
  ('piha-palvelu', 'Piha & ulkoalueet', 'Nurmikko, lumityö, piha- ja ulkoalueiden hoito', 20),
  ('kuljetus', 'Kuljetus & muutto', 'Muutot, kantoapu ja tavarakuljetukset', 21)
on conflict (slug) do update set
  name_fi = excluded.name_fi,
  description_fi = excluded.description_fi,
  sort_order = excluded.sort_order;

create or replace function public._seed_job(
  p_slug text,
  p_name text,
  p_desc text,
  p_keywords text[],
  p_legacy_slug text,
  p_sort int,
  p_trades text[]
) returns void
language plpgsql
as $$
declare
  v_jt_id uuid;
  v_cat_id uuid;
  t_slug text;
  t_id uuid;
begin
  select id into v_cat_id from public.service_categories where slug = p_legacy_slug limit 1;
  if v_cat_id is null then
    select id into v_cat_id from public.service_categories where slug = 'muu' limit 1;
  end if;

  insert into public.job_types (slug, name_fi, description_fi, search_keywords, legacy_category_id, sort_order, is_active)
  values (p_slug, p_name, p_desc, p_keywords, v_cat_id, p_sort, true)
  on conflict (slug) do update set
    name_fi = excluded.name_fi,
    description_fi = excluded.description_fi,
    search_keywords = excluded.search_keywords,
    legacy_category_id = excluded.legacy_category_id,
    sort_order = excluded.sort_order,
    is_active = true
  returning id into v_jt_id;

  delete from public.job_type_trades where job_type_id = v_jt_id;

  foreach t_slug in array p_trades loop
    select id into t_id from public.trades where slug = t_slug;
    if t_id is not null then
      insert into public.job_type_trades (job_type_id, trade_id, is_required)
      values (v_jt_id, t_id, true)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

select public._seed_job(
  'siivous-koti',
  'Kotisiivous',
  'Säännöllinen tai kertaluonteinen siivous',
  array['siivous','kotisiivous','siivouspalvelu','siivota'],
  'muu',
  80,
  array['siivous']
);

select public._seed_job(
  'siivous-loppu',
  'Loppusiivous',
  'Remontin tai muuton jälkeinen siivous',
  array['loppusiivous','remonttisiivous','rakennussiivous'],
  'muu',
  81,
  array['siivous']
);

select public._seed_job(
  'muutto',
  'Muutto / kantoapu',
  'Muutto, kantoapu ja pakkausapu',
  array['muutto','muuttopalvelu','kantoapu','muuttoapu'],
  'muu',
  82,
  array['kuljetus']
);

select public._seed_job(
  'kuljetus',
  'Kuljetus / tavarakuljetus',
  'Huonekalut, rakennustarvikkeet, pienkuorma',
  array['kuljetus','tavarakuljetus','pienkuorma','kuljetuspalvelu'],
  'muu',
  83,
  array['kuljetus']
);

select public._seed_job(
  'ikkunanpesu',
  'Ikkunanpesu',
  'Ikkunat, lasitukset, parvekkeet',
  array['ikkunanpesu','ikkunan pesu','lasinpesu','ikkunat pesu'],
  'muu',
  84,
  array['siivous']
);

select public._seed_job(
  'kattopesu',
  'Kattopesu',
  'Kattopesu, sammaleen poisto, sadevesikourujen puhdistus',
  array['kattopesu','katon pesu','sammaleen poisto','kattohuolto'],
  'katto',
  85,
  array['kattomies']
);

select public._seed_job(
  'nurmikon-leikkuu',
  'Nurmikon leikkuu',
  'Nurmikon leikkuu ja reunusleikkuu',
  array['nurmikon leikkuu','nurmikko','ruohonleikkuu','piha'],
  'muu',
  86,
  array['piha-palvelu']
);

select public._seed_job(
  'lumityo',
  'Lumityö / auraus',
  'Lumen auraus, lumen työntö, hiekoitus',
  array['lumityö','lumityo','auraus','lumen auraus','hiekoitus','lumenluonti'],
  'muu',
  87,
  array['piha-palvelu']
);

drop function public._seed_job(text, text, text, text[], text, int, text[]);
