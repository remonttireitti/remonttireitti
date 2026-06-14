-- Kiinteistön laajennetut tiedot huoltokirjaa varten.

create type public.property_building_type as enum (
  'omakotitalo',
  'paritalo',
  'rivitalo',
  'kerrostalo',
  'mokki',
  'taloyhtio',
  'muu'
);

alter table public.properties
  add column if not exists property_type public.property_building_type,
  add column if not exists built_year int
    check (built_year is null or (built_year >= 1800 and built_year <= 2100)),
  add column if not exists floor_area_m2 numeric(8, 1)
    check (floor_area_m2 is null or floor_area_m2 > 0),
  add column if not exists notes text,
  add column if not exists details jsonb not null default '{}';

comment on column public.properties.property_type is 'Rakennustyyppi (omakotitalo, mökki, …)';
comment on column public.properties.built_year is 'Rakennusvuosi';
comment on column public.properties.floor_area_m2 is 'Pinta-ala m² (esim. huoneisto tai rakennus)';
comment on column public.properties.notes is 'Yleiset muistiinpanot kiinteistöstä';
comment on column public.properties.details is
  'Strukturoitu data: heating, ventilation, fireplaces, sauna, …';
