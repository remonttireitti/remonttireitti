-- MVP: vain lämpöpumppujen kilpailutus

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
  ('ilmalampopumppu', 'Ilmalämpöpumppu', 'Lämmitys ja viilennys', array['ilmalämpöpumppu','ilmalampopumppu','ilp','ilmalämpö'], 1),
  ('ilmavesilampopumppu', 'Vesi-ilmalämpöpumppu', 'Patteriverkosto tai lattialämpö', array['vesi-ilmalämpöpumppu','ilmavesi','ivlp','vesilämpöpumppu'], 2),
  ('poistoilmalampopumppu', 'Poistoilmalämpöpumppu', 'Poistoluukun lämpö talteen', array['poistoilmalämpöpumppu','poistoilma','pilp'], 3),
  ('maalampopumppu', 'Maalämpöpumppu', 'Maalämpökeruu', array['maalämpö','maalampo','maalämpöpumppu','geo'], 4)
) as v(slug, name_fi, description_fi, search_keywords, sort_order)
cross join (select id from public.service_categories where slug = 'muu' limit 1) sc
on conflict (slug) do update set
  name_fi = excluded.name_fi,
  description_fi = excluded.description_fi,
  search_keywords = excluded.search_keywords,
  sort_order = excluded.sort_order,
  is_active = true;

update public.job_types
set is_active = false
where slug not in (
  'ilmalampopumppu',
  'ilmavesilampopumppu',
  'poistoilmalampopumppu',
  'maalampopumppu'
);

delete from public.job_type_trades
where job_type_id in (
  select id from public.job_types
  where slug in (
    'ilmalampopumppu',
    'ilmavesilampopumppu',
    'poistoilmalampopumppu',
    'maalampopumppu'
  )
);

insert into public.job_type_trades (job_type_id, trade_id, is_required)
select jt.id, t.id, true
from (values
  ('ilmalampopumppu', 'sahko'),
  ('ilmavesilampopumppu', 'sahko'),
  ('ilmavesilampopumppu', 'putki'),
  ('poistoilmalampopumppu', 'iv'),
  ('poistoilmalampopumppu', 'sahko'),
  ('maalampopumppu', 'putki'),
  ('maalampopumppu', 'sahko')
) as v(jt_slug, trade_slug)
join public.job_types jt on jt.slug = v.jt_slug
join public.trades t on t.slug = v.trade_slug
on conflict do nothing;
