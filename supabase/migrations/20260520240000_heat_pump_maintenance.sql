-- Lämpöpumpun huolto- ja korjauspyynnöt (erillinen kilpailutuspolku)

insert into public.job_types (slug, name_fi, description_fi, search_keywords, legacy_category_id, sort_order, is_active)
select
  v.slug,
  v.name_fi,
  v.description_fi,
  v.search_keywords,
  sc.id,
  v.sort_order,
  true
from (values
  (
    'lampopumppu-huolto',
    'Lämpöpumpun huolto',
    'Säännöllinen huolto, tarkastus ja huoltosopimus',
    array['huolto','lämpöpumppu','ilp','ivlp','maalämpö'],
    5
  ),
  (
    'lampopumppu-korjaus',
    'Lämpöpumpun korjaus',
    'Vika, häiriö tai korjaustarve',
    array['korjaus','vika','häiriö','lämpöpumppu','rikki'],
    6
  )
) as v(slug, name_fi, description_fi, search_keywords, sort_order)
cross join (select id from public.service_categories where slug = 'muu' limit 1) sc
on conflict (slug) do update set
  name_fi = excluded.name_fi,
  description_fi = excluded.description_fi,
  search_keywords = excluded.search_keywords,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.job_type_trades (job_type_id, trade_id, is_required)
select jt.id, t.id, true
from (values
  ('lampopumppu-huolto', 'sahko'),
  ('lampopumppu-huolto', 'putki'),
  ('lampopumppu-korjaus', 'sahko'),
  ('lampopumppu-korjaus', 'putki')
) as v(jt_slug, trade_slug)
join public.job_types jt on jt.slug = v.jt_slug
join public.trades t on t.slug = v.trade_slug
on conflict do nothing;
