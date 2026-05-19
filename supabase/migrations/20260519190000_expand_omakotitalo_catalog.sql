-- Laajenna työ- ja hakusanaluettelo omakotitalolle (rakenne → tekniikka → sisä → piha)

insert into public.trades (slug, name_fi, description_fi, sort_order) values
  ('eristys', 'Eristäjä', 'Lämmöneristeet, tuulenpitävät, äänieristeet', 13),
  ('betoni', 'Betonityöt', 'Perustukset, laatat, valu', 14),
  ('lasi', 'Lasiasentaja', 'Ikkunat, ovet, lasitukset', 15),
  ('maanrakennus', 'Maanrakennus', 'Kaivuu, täyttö, pihamaa', 16),
  ('pelti', 'Peltiseppä', 'Kattopellit, rännit, kourut', 17),
  ('rakennusapu', 'Rakennusapu', 'Telineet, apumiehet', 18)
on conflict (slug) do update set
  name_fi = excluded.name_fi,
  description_fi = excluded.description_fi,
  sort_order = excluded.sort_order;

-- Apufunktio: lisää työn + ammatit (ajetaan DO-lohkossa)
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

  insert into public.job_types (slug, name_fi, description_fi, search_keywords, legacy_category_id, sort_order)
  values (p_slug, p_name, p_desc, p_keywords, v_cat_id, p_sort)
  on conflict (slug) do update set
    name_fi = excluded.name_fi,
    description_fi = excluded.description_fi,
    search_keywords = excluded.search_keywords,
    legacy_category_id = excluded.legacy_category_id,
    sort_order = excluded.sort_order
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

-- RAKENNE & RUNKO
select public._seed_job('perustus', 'Perustustyöt', 'Antura, laatta, paalut', array['perustus','antura','sokkeli','laattaperustus','paalutus','rakennuslupa'], 'muu', 20, array['betoni','maanrakennus','kirvesmies']);
select public._seed_job('sokkeli', 'Sokkelityöt ja salaojitus', 'Sokkelieriste, salaojat, sokkelin korjaus', array['sokkeli','salaoja','salaojitus','märkätila','routaeriste'], 'muu', 21, array['betoni','maanrakennus','putki']);
select public._seed_job('vaihe-eriste', 'Välipohjan / yläpohjan eristys', 'Lisäeristys, tuulenpitävä levy', array['välipohja','valipohja','yläpohja','ylapohja','eriste','villa','mineraalivilla'], 'muu', 22, array['eristys','kirvesmies']);
select public._seed_job('laajennus', 'Laajennus tai lisärakennus', 'Tilalaajennus, autotalli, varasto', array['laajennus','lisärakennus','autotalli','varasto','rakennuslupa'], 'huoneisto', 23, array['kirvesmies','betoni','sahko','putki']);
select public._seed_job('kantava-seina', 'Kantavan seinän avaus / muutos', 'Oviaukko, kantavan muutos', array['kantava','oviaukko','seinän avaus','palkki','kantava seinä'], 'muu', 24, array['kirvesmies','betoni']);

-- ULKOKATE & JULKISIVU
select public._seed_job('katto-pelti', 'Kattoremontti (pelti / huopa)', 'Huopakate, peltikate, katon tiivistys', array['katto','kattoremontti','peltikatto','huopa','huopakatto','vesikate','katon vuoto'], 'katto', 30, array['kattomies','pelti']);
select public._seed_job('rannit', 'Rännit ja kourut', 'Sadevesijärjestelmä, rännien vaihto', array['rännit','rannit','kourut','sadevesi','sadevesijärjestelmä'], 'katto', 31, array['pelti','kattomies']);
select public._seed_job('julkisivu-verhous', 'Julkisivun verhous', 'Puuviilu, komposiitti, ulkoverhous', array['julkisivu','verhous','ulko','ulkoverhous','paneeli'], 'julkisivu', 32, array['kirvesmies','maalari']);
select public._seed_job('julkisivu-rapaus', 'Julkisivun rapaus / tiilijulkisivu', 'Rappaus, tiili, halkeamat', array['rapaus','rappaus','tiili','julkisivu','halkeama'], 'julkisivu', 33, array['muurari','maalari']);
select public._seed_job('ulkomaalaus', 'Ulkomaalaus', 'Julkisivun maalaus, puuosat', array['ulkomaalaus','ulkopuoli','maalaus ulko','maalaus'], 'maalaus', 34, array['maalari']);
select public._seed_job('ikkunat', 'Ikkunoiden vaihto', 'Energiatehokkaat ikkunat, asennus', array['ikkuna','ikkunat','lasitus','lasi','ikkunaremontti'], 'muu', 35, array['lasi','kirvesmies']);
select public._seed_job('ovet-ulko', 'Ulko-ovet', 'Etuovi, terassiovi, autotalliovi', array['ovi','ovet','ulkoovi','terassiovi','autotalliovi'], 'muu', 36, array['lasi','kirvesmies']);

-- LÄMMITYS & ENERGIA
select public._seed_job('lampopumppu-ilmavesi', 'Ilmavesilämpöpumppu', 'Asennus ja käyttöönotto', array['lämpöpumppu','lampopumppu','ilmavesi','ilma vesi','ivlp','vesilämpöpumppu'], 'muu', 40, array['sahko','putki']);
select public._seed_job('lampopumppu-ilma', 'Ilmalämpöpumppu', 'Ilmalämpöpumppu asennus', array['ilmalämpöpumppu','ilmalampopumppu','ilmalämpö','ilp'], 'muu', 41, array['sahko','putki']);
select public._seed_job('lammitys-vaihto', 'Lämmitysjärjestelmän vaihto', 'Öljy→pumppu, kaukolämpö, patterit', array['lämmitys','lammitys','kattila','öljylämmitys','patteri','patterivaihto','lattialämmitys'], 'muu', 42, array['putki','sahko']);
select public._seed_job('aurinkopaneelit', 'Aurinkopaneelit', 'Aurinkosähkö, invertteri', array['aurinkopaneeli','aurinkosähkö','aurinkovoima','paneelit','invertteri'], 'sahko', 43, array['sahko']);
select public._seed_job('latauspiste', 'Sähköauton latauspiste', 'Kotilataus, wallbox', array['latauspiste','lataus','sähköauto','sahkoauto','wallbox'], 'sahko', 44, array['sahko']);

-- SÄHKÖ & PUTKI & IV
select public._seed_job('sahkokeskus', 'Sähkökeskuksen uusinta', 'Pääkeskus, johdot, vikavirta', array['sähkökeskus','sahkokeskus','sähkö','sahko','johdotus','pääsulake'], 'sahko', 50, array['sahko']);
select public._seed_job('sahko-lisays', 'Sähköpisteiden lisäys', 'Pistorasiat, valaisimet, kytkimet', array['pistorasia','valaisin','valaistus','sähköpiste','kytkin'], 'sahko', 51, array['sahko']);
select public._seed_job('viemari', 'Viemärikorjaus / uusinta', 'Viemäriputki, tukos, huuhtelu', array['viemäri','viemari','viemäriputki','tukos','huuhtelu'], 'putki', 52, array['putki']);
select public._seed_job('vesivahinko', 'Vesivahingon korjaus', 'Vuoto, kuivatus, putkikorjaus', array['vesivahinko','vuoto','vesivuoto','kosteus','putkivuoto'], 'putki', 53, array['putki','kirvesmies','eristys']);
select public._seed_job('kayttovesi', 'Käyttövesiputkisto', 'Putkien uusinta, hanat', array['käyttövesi','kayttovesi','putkisto','hanaremontti'], 'putki', 54, array['putki']);
select public._seed_job('ilmanvaihto-kone', 'Ilmanvaihtokoneen asennus', 'IV-kone, kanavisto', array['ilmanvaihto','iv','iv-kone','kanavisto','ilmanvaihtoremontti'], 'muu', 55, array['iv','sahko']);
select public._seed_job('ilmanvaihto-puhdistus', 'Ilmanvaihdon puhdistus', 'Kanavien puhdistus, suodattimet', array['ilmanvaihto puhdistus','kanavapuhdistus','suodatin'], 'muu', 56, array['iv']);

-- SISÄTILAT
select public._seed_job('keittio', 'Keittiöremontti', 'Kaapit, tasot, kodinkoneet', array['keittiö','keittio','keittiöremontti','kaapistot','keittiötaso'], 'keittio', 60, array['kirvesmies','putki','sahko','maalari']);
select public._seed_job('kylpyhuone', 'Kylpyhuoneremontti', 'Laatoitus, putket, kalusteet', array['kylpyhuone','kylpy','kylpyhuoneremontti','pesuhuone','wc'], 'kylpyhuone', 61, array['putki','sahko','laatoitus','maalari']);
select public._seed_job('wc-remontti', 'WC-remontti', 'WC-istuin, laatoitus, putket', array['wc','vessa','käymälä','wc-remontti'], 'kylpyhuone', 62, array['putki','laatoitus']);
select public._seed_job('sauna', 'Saunaremontti / uusi sauna', 'Sähkökiuas, panelit, lauteet', array['sauna','saunaremontti','kiuas','sähkökiuas','lauteet'], 'sauna', 63, array['kirvesmies','sahko','putki']);
select public._seed_job('lattia-sisä', 'Sisälattian uusinta', 'Parketti, laminaatti, laatta', array['lattia','parketti','laminaatti','laattalattia','lattian vaihto'], 'lattia', 64, array['lattia','kirvesmies']);
select public._seed_job('seinamaalaus', 'Sisämaalaus', 'Seinät, katot, tapetointi', array['maalaus','sisämaalaus','seinä','tapetti','tapetointi'], 'maalaus', 65, array['maalari']);
select public._seed_job('laatoitus-sisa', 'Laatoitus (sisä)', 'Kylpyhuone, eteinen, takka', array['laatoitus','laatta','saumaus'], 'kylpyhuone', 66, array['laatoitus']);
select public._seed_job('sisakatto', 'Sisäkaton korjaus', 'Rappaus, halkeama, home', array['sisäkatto','katto sisällä','rappaus','halkeama'], 'muu', 67, array['kirvesmies','maalari']);

-- PIHA & ULKO
select public._seed_job('terassi', 'Terassin rakentaminen', 'Puuterassi, komposiitti', array['terassi','terassiremontti','ulkoterassi'], 'muu', 70, array['kirvesmies','betoni']);
select public._seed_job('pihatie', 'Pihatie / asfaltti / kivitys', 'Pihakäytävät, pysäköintipaikka', array['pihatie','asfaltti','kivitys','pihakivi','betoni piha'], 'muu', 71, array['maanrakennus','betoni']);
select public._seed_job('aita', 'Aidan rakentaminen', 'Puut, metalliaita', array['aita','piiha','aitaus'], 'muu', 72, array['kirvesmies']);
select public._seed_job('ulko-valaistus', 'Ulkovalaisu', 'Pihavalaistus, seinävalot', array['ulkovalo','pihavalaistus','valaisin ulko'], 'sahko', 73, array['sahko']);
select public._seed_job('lumityo', 'Lumenluonti ja katosten poisto', 'Katos, lumi', array['lumi','lumityö','lumityo','katosten poisto'], 'muu', 74, array['kuljetus','kirvesmies']);

-- ERITYISTYÖT
select public._seed_job('home-korjaus', 'Home- tai kosteusvaurion korjaus', 'Kartoitus, purku, kuivaus', array['home','kosteus','kosteusvaurio','kuivaus','purku'], 'muu', 80, array['purku','eristys','kirvesmies','maalari']);
select public._seed_job('oljy-sailio', 'Öljysäiliön poisto / vaihto', 'Säiliön poisto, maaperä', array['öljysäiliö','oljysailio','säiliö','öljylämmitys'], 'muu', 81, array['putki','maanrakennus']);
select public._seed_job('palo-ovi', 'Palo-ovet ja paloturvallisuus', 'Palo-ovi, paloluokka', array['palo-ovi','paloturva'], 'muu', 82, array['lasi','kirvesmies']);

-- Päivitä myös alkuperäiset lyhyet slugit laajemmilla hakusanoilla
update public.job_types set search_keywords = array[
  'keittiö','keittio','keittiöremontti','kaapistot','keittiötaso','kodinkone','remontti'
] where slug = 'keittio-asennus';

update public.job_types set search_keywords = array[
  'kylpyhuone','kylpy','kylpyhuoneremontti','pesuhuone','wc','suihku','amme'
] where slug = 'kylpyhuone-remontti';

update public.job_types set search_keywords = array[
  'lämpöpumppu','lampopumppu','ilmalämpöpumppu','vesilämpöpumppu','ilmavesilämpöpumppu','ivlp','pumppu'
] where slug = 'lampopumppu';

update public.job_types set search_keywords = array[
  'ilmanvaihto','iv','iv-kone','kanavisto','ilmanvaihtoremontti','ilmanvaihto kone'
] where slug = 'ilmanvaihto';

update public.job_types set search_keywords = array[
  'sähkö','sahko','sähkötyöt','pistorasia','valaisin','sähköasentaja','sähkömies'
] where slug = 'sahko-korjaus';

update public.job_types set search_keywords = array[
  'putki','putkityöt','putkimies','lvi','viemäri','vesi','putkiremontti'
] where slug = 'putki-korjaus';

update public.job_types set search_keywords = array[
  'maalaus','maalari','tapetointi','seinä','katto maalaus','maalaus sisä','maalaus ulko'
] where slug = 'maalaus';

update public.job_types set search_keywords = array[
  'katto','kattoremontti','vesikate','katon vuoto','huopa','pelti'
] where slug = 'katto';

update public.job_types set search_keywords = array[
  'kokonaisremontti','talon remontti','omakotitalo','asunto','remontti','peruskorjaus'
] where slug = 'kokonaisremontti';

update public.job_types set search_keywords = array[
  'muu','remontti','korjaus','asennus','työ','apu'
] where slug = 'muu';

drop function public._seed_job(text, text, text, text[], text, int, text[]);
