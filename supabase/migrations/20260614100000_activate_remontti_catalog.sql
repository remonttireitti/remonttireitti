-- Julkinen remonttivalikoima (heat_pump_focus.sql deaktivoi muut työt)

update public.job_types
set is_active = true
where slug in (
  -- Lämmitys
  'lammitys-vaihto',
  -- Sähkö & energia
  'latauspiste',
  'aurinkopaneelit',
  'sahkokeskus',
  'sahko-lisays',
  'ulko-valaistus',
  -- LVI & ilma
  'ilmanvaihto-kone',
  'ilmanvaihto-puhdistus',
  'kayttovesi',
  'viemari',
  'vesivahinko',
  -- Sisätilat
  'keittio',
  'kylpyhuone',
  'wc-remontti',
  'sauna',
  'lattia-sisä',
  'seinamaalaus',
  'laatoitus-sisa',
  -- Ulkokuori
  'ikkunat',
  'ovet-ulko',
  'katto-pelti',
  'rannit',
  'ulkomaalaus',
  'julkisivu-verhous',
  'julkisivu-rapaus',
  -- Perustus & runko
  'sokkeli',
  'perustus',
  'vaihe-eriste',
  -- Piha
  'terassi',
  'pihatie',
  'aita'
);
