-- Pro-paketin ilmoitukset näkyvät korostettuina torin haussa.

alter table public.equipment_listings
  add column if not exists highlighted_in_search boolean not null default false;

create index if not exists equipment_listings_highlighted_published_idx
  on public.equipment_listings (highlighted_in_search desc, published_at desc)
  where status = 'published';

comment on column public.equipment_listings.highlighted_in_search is
  'Pro-tilauksen ilmoitukset: korostus listauksessa ennen muita';

-- Olemassa olevat Pro-julkaisut
update public.equipment_listings el
set highlighted_in_search = true
from public.marketplace_plans mp
where el.plan_id = mp.id
  and mp.slug = 'contractor_pro'
  and el.status = 'published';

update public.equipment_listings el
set highlighted_in_search = true
from public.seller_subscriptions ss
join public.marketplace_plans mp on mp.id = ss.plan_id
where el.subscription_id = ss.id
  and mp.slug = 'contractor_pro'
  and el.status = 'published'
  and el.highlighted_in_search = false;
