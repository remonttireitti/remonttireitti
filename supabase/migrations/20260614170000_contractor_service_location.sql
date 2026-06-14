-- Urakoitsijan toimipaikka ja matkustussäde tarjouspyyntöjen rajaukseen.

alter table public.contractor_profiles
  add column if not exists service_postal_code text,
  add column if not exists service_municipality text,
  add column if not exists max_travel_km int not null default 100
    check (max_travel_km >= 10 and max_travel_km <= 500);

comment on column public.contractor_profiles.service_postal_code is
  'Toimipaikan postinumero — etäisyyslaskenta tarjouspyyntöihin';
comment on column public.contractor_profiles.service_municipality is
  'Toimipaikan kunta — etäisyyslaskenta tarjouspyyntöihin';
comment on column public.contractor_profiles.max_travel_km is
  'Kuinka kaukaa urakoitsija ottaa töitä (km, oletus 100)';

-- Postinumeron likimääräiset koordinaatit (WGS84). Täydennetään tarpeen mukaan.
create table if not exists public.postal_code_geo (
  postal_code char(5) primary key,
  municipality text not null,
  lat double precision not null,
  lng double precision not null
);

alter table public.postal_code_geo enable row level security;

create policy "postal_code_geo: public read"
  on public.postal_code_geo for select
  using (true);

-- Keskeiset postinumerot (kattaa suurimman osan väestöstä)
insert into public.postal_code_geo (postal_code, municipality, lat, lng) values
  ('00100', 'Helsinki', 60.1699, 24.9384),
  ('00200', 'Helsinki', 60.1850, 24.8750),
  ('00300', 'Helsinki', 60.2050, 24.9500),
  ('00400', 'Helsinki', 60.2300, 24.9000),
  ('00500', 'Helsinki', 60.1850, 24.9600),
  ('00600', 'Helsinki', 60.2200, 24.9400),
  ('00700', 'Helsinki', 60.2100, 25.0200),
  ('00800', 'Helsinki', 60.1900, 25.0400),
  ('00900', 'Helsinki', 60.1700, 25.0800),
  ('01000', 'Vantaa', 60.2941, 25.0400),
  ('01300', 'Vantaa', 60.3200, 25.0800),
  ('01510', 'Vantaa', 60.3100, 24.9600),
  ('01600', 'Vantaa', 60.2800, 24.8500),
  ('02100', 'Espoo', 60.2055, 24.6559),
  ('02200', 'Espoo', 60.2200, 24.7000),
  ('02320', 'Espoo', 60.2500, 24.6500),
  ('02600', 'Espoo', 60.2100, 24.7800),
  ('02700', 'Kauniainen', 60.2120, 24.7290),
  ('02880', 'Espoo', 60.2800, 24.5200),
  ('03100', 'Nummela', 60.3350, 24.3200),
  ('04200', 'Kerava', 60.4040, 25.1050),
  ('04300', 'Tuusula', 60.4030, 25.0260),
  ('04400', 'Järvenpää', 60.4740, 25.0900),
  ('04600', 'Mäntsälä', 60.6330, 25.3200),
  ('05800', 'Hyvinkää', 60.6300, 24.8600),
  ('06100', 'Porvoo', 60.3930, 25.6640),
  ('06400', 'Loviisa', 60.4570, 26.2270),
  ('08100', 'Lohja', 60.2500, 24.0650),
  ('10300', 'Karjaa', 60.0710, 23.7150),
  ('10600', 'Tammisaari', 59.9750, 23.4370),
  ('13100', 'Hämeenlinna', 60.9960, 24.4640),
  ('15100', 'Lahti', 60.9827, 25.6612),
  ('15800', 'Lahti', 60.9700, 25.5500),
  ('20100', 'Turku', 60.4518, 22.2666),
  ('20500', 'Turku', 60.4300, 22.3200),
  ('20810', 'Turku', 60.4700, 22.2000),
  ('21100', 'Naantali', 60.4670, 22.0240),
  ('21200', 'Raisio', 60.4860, 22.1690),
  ('24100', 'Salo', 60.3830, 23.1300),
  ('26100', 'Rauma', 61.1270, 21.5110),
  ('28100', 'Pori', 61.4850, 21.7970),
  ('30100', 'Forssa', 60.8140, 23.6210),
  ('33100', 'Tampere', 61.4978, 23.7610),
  ('33200', 'Tampere', 61.4800, 23.7800),
  ('33500', 'Tampere', 61.5100, 23.7200),
  ('33700', 'Tampere', 61.4600, 23.8200),
  ('33900', 'Tampere', 61.5300, 23.6800),
  ('35800', 'Mänttä-Vilppula', 62.0300, 24.6200),
  ('36100', 'Kangasala', 61.4640, 24.0760),
  ('37100', 'Nokia', 61.4780, 23.5060),
  ('37200', 'Sastamala', 61.3500, 22.7000),
  ('38200', 'Sastamala', 61.3400, 22.7300),
  ('40100', 'Jyväskylä', 62.2426, 25.7473),
  ('40320', 'Jyväskylä', 62.2200, 25.7000),
  ('42100', 'Jämsä', 61.8640, 25.1900),
  ('43100', 'Saarijärvi', 62.7050, 25.2540),
  ('44100', 'Äänekoski', 62.6000, 25.7300),
  ('45100', 'Kouvola', 60.8680, 26.7040),
  ('48200', 'Kotka', 60.4660, 26.9460),
  ('50100', 'Mikkeli', 61.6880, 27.2720),
  ('53100', 'Lappeenranta', 61.0580, 28.1880),
  ('60100', 'Seinäjoki', 62.7910, 22.8400),
  ('65100', 'Vaasa', 63.0960, 21.6158),
  ('67100', 'Kokkola', 63.8380, 23.1300),
  ('70100', 'Kuopio', 62.8920, 27.6770),
  ('70700', 'Kuopio', 62.9000, 27.6000),
  ('80100', 'Joensuu', 62.6010, 29.7630),
  ('90100', 'Oulu', 65.0121, 25.4651),
  ('90570', 'Oulu', 65.0600, 25.4500),
  ('92100', 'Raahe', 64.6840, 24.4790),
  ('94100', 'Kemi', 65.7360, 24.5640),
  ('96100', 'Rovaniemi', 66.5039, 25.7294),
  ('98100', 'Kemijärvi', 66.7130, 27.4300),
  ('99100', 'Kittilä', 67.6550, 24.9010)
on conflict (postal_code) do nothing;

create or replace function public.distance_km_between_postal_codes(
  postal_a text,
  postal_b text
)
returns double precision
language plpgsql
stable
as $$
declare
  geo_a public.postal_code_geo%rowtype;
  geo_b public.postal_code_geo%rowtype;
  norm_a text;
  norm_b text;
begin
  norm_a := lpad(trim(postal_a), 5, '0');
  norm_b := lpad(trim(postal_b), 5, '0');

  if norm_a !~ '^\d{5}$' or norm_b !~ '^\d{5}$' then
    return null;
  end if;

  select * into geo_a from public.postal_code_geo where postal_code = norm_a;
  if not found then
    return null;
  end if;

  select * into geo_b from public.postal_code_geo where postal_code = norm_b;
  if not found then
    return null;
  end if;

  -- Haversine (WGS84)
  return (
    6371 * acos(
      least(
        1.0,
        greatest(
          -1.0,
          cos(radians(geo_a.lat)) * cos(radians(geo_b.lat))
            * cos(radians(geo_b.lng) - radians(geo_a.lng))
            + sin(radians(geo_a.lat)) * sin(radians(geo_b.lat))
        )
      )
    )
  );
end;
$$;

grant execute on function public.distance_km_between_postal_codes(text, text) to authenticated;

comment on function public.distance_km_between_postal_codes is
  'Likimääräinen etäisyys km postinumerojen välillä (tunnetuista koordinaateista)';
