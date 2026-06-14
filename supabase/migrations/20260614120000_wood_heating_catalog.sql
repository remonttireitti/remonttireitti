-- Puulämmitys: takat, puukattilat, hormit

insert into public.trades (slug, name_fi, description_fi, sort_order) values
  ('nuohooja', 'Nuohooja', 'Hormien nuohous ja tarkastus', 19)
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
  'takka-kamiina',
  'Takka, kamiina tai leivinuuni',
  'Uusi takka, kamiina, leivinuuni tai uunin uusinta',
  array['takka','kamiina','leivinuuni','tulisija','avotakka','muurattu takka','takan remontti'],
  'muu', 45, array['muurari','kirvesmies']
);

select public._seed_job(
  'puukattila',
  'Puukattila tai puulämmityskeskus',
  'Puukattilan asennus, vaihto tai liitäntä patteriverkkoon',
  array['puukattila','puulämmitys','puulammitys','kattila','puu','pelletti','vesikiertoinen'],
  'muu', 46, array['putki','kirvesmies','muurari']
);

select public._seed_job(
  'hormi',
  'Hormi ja savupiippu',
  'Uusi hormi, sisäputki, korjaus tai nuohous',
  array['hormi','savupiippu','nuohous','nuohooja','hormin uusinta','sisäputki','savuhormi','piippu'],
  'muu', 47, array['muurari','pelti','nuohooja']
);

select public._seed_job(
  'puulammitys-varaaja',
  'Puulämmityksen varaaja tai akku',
  'Lämmön varaaja, akku tai pufferi puulämmitykseen',
  array['varaaja','pufferi','akku','lämmön varaaja','esilämmitys'],
  'muu', 48, array['putki','kirvesmies']
);

drop function public._seed_job(text, text, text, text[], text, int, text[]);
