# Lämmitys, ILP ja IV — toimintaselostus

Tämä on se, miten ohjaus nyt olettaa putket ja päätökset. Jos jokin kohta ei pidä paikkaansa talossa, se pitää korjata.

## 1. Putket (oletus)

Kolme vesi-anturia:

| Anturi | Mitä |
|---|---|
| `sensor.vilp_ohjaus_lampotilat_air_temperature_8` | Käyttövesi (KV) |
| `sensor.vilp_ohjaus_lampotilat_air_temperature_13` | Lämmityspiirin varaaja (pieni) |
| `sensor.vilp_ohjaus_lampotilat_air_temperature_10` | Lattian menovesi |
| `sensor.vilp_ohjaus_lampotilat_air_temperature_9` | Lattian paluu (vain näyttö) |

Virtaus oletuksena:

1. KV on erillinen kuuma varasto.
2. **Sekoituspumppu** `switch.sonoff_4_ch_pro_2_tasmota4` ottaa lämpöä KV:stä ja lataa lämmitysvaraajaa. Se ei lämmitä menovettä suoraan.
3. Menovesi tulee varaajasta kiertopumpulla `switch.sonoff_4_ch_pro_2_tasmota2` huoneiden lattioihin.
4. `climate.lattialammitys` on **varaajan termostaatti**. Sen heater `switch.energia_mittaus_koko_talo` on virtuaalinen energiamittaus — se ei lämmitä mitään.
5. **Läpivirtausvastus** `switch.pannuhuone_lapivirtausvastus` (4 kW) on menoveden putkessa. Ilman kiertoa se ei saa olla päällä.
6. **Aurinkopumppu** `switch.sonoff_4_ch_pro_2_tasmota3` siirtää kennon lämpöä samaan varaajaan, jos kenno on kuumempi.
7. **Keittiö ILP** lämmittää vain olo+keittiön ilman. Ei makuuhuoneita, ei varaajaa.

## 2. Kuka lämmittää mitä, ja missä järjestyksessä

### Olo + keittiö

- Ensisijainen: ILP (`climate.keittio_ilp`).
- Lattia normaalisti taustalla (oletus 18 °C), ettei lattia ja ILP taistele.
- Lattia nousee käyttöasetukseen vain ennakoivassa (halpa sähkö, hinta nousemassa) tai korotuksessa.

### Makuuhuoneet (HM, makuhuone, Glen, Nele) ja eteinen

- Vain lattia. ILP ei lämmitä näitä.
- Vakio: makuuhuoneet 20 °C, eteinen 23 °C.

### Lämmitysvesi

1. Aurinko, jos kenno on kuumempi kuin varaaja (ero > 7 °C). Pumppu saa olla. Sekoitus ja vastus väistävät vain jos aurinko **riittää 300 l varaajaan** (kausi + kWh). Marras–helmi ei riitä vaikka paistaisi. 1 kWh ≈ +2,9 °C / 300 l — jos vaje on isompi, lämmitä vastuksella.
2. Sekoituspumppu vain pulssina, jos KV on reilusti ylijäämässä (oletus ≥ 68 °C, vähintään 67, plus lisää jos spot kallis) ja KV on ~1,5 °C kuumempi kuin varaaja. KV:tä lämmittää 3 kW vastus ilman kytkintä: jos teho nousee ~3 kW tai KV nousee, sekoitus ei varasta. Kallista sähköä ei pidä laukaista.
3. Läpivirtausvastus, jos KV on liian kylmä varastettavaksi, kierto on käynyt ≥ 4 min, ja joko jokin lattia lämmittää tai varaaja kutsuu lämpöä.

Käyttöveden suoja: pulssi 15 s, odotus 180 s (pitenee jos KV laski tai spot kallis). Pois heti jos KV ≤ 64 °C, lasku pulssissa ≥ 0,5 °C, tai KV laskee > 1,2 °C / 5 min. Lattia sitten läpivirtausvastuksella, ei tyhjentämällä käyttövettä.

Aurinkolämpö kWh on kalenterijakso, sama kuin talon kulutus: kuluva päivä (00:00→nyt), kuluva viikko (ma→nyt), kuluva kuukausi (1. pvä→nyt). Varaaja ~300 l: 1 kWh ≈ +2,9 °C. Jos laskenta sanoo ettei riitä, pumppu saa jäädä päälle mutta sekoitus ja vastus jatkavat.

## 3. Varaajan termostaatti

`climate.lattialammitys` pidetään `heat`-tilassa. Sille kirjoitetaan sama tavoite kuin menovedelle (`sensor.lammitys_sekoitus_kaytto`): huone + 5 ja ulkokäyrä siirrettynä. Spot, hetkellinen ja ennakoiva tulevat huoneiden asetuksen kautta.

Kun varaaja on alle tavoitteen, termostaatti näyttää heating ja virtuaalikytkin menee päälle. Se ei ole lämpö. Oikea lämpö:

- KV kuuma → sekoituspumppu lataa varaajaa
- KV kylmä → kiertopumppu päälle, 4 min jälkeen vastus pulssittaa menovettä (15 s / 30 s)

Vastus ei käy pelkällä kiertopumpulla: vähintään yksi lämmityspiiri (`binary_sensor.lammitys_piiri_auki`) pitää olla yhtä aikaa päällä, muuten vesi ei kierrä vastuksen läpi. Kaikki huoneet Pois → ei piiriä → vastus kielletty. Hetkellinen ≥ 50 c/t kieltää vastuksen (huoneen alaraja ohittaa).

## 4. Menoveden tavoite seuraa huoneita

Kaikkien huoneiden asetus muuttuu ulkolämmöstä, spotista ja hetkellisestä kulutuksesta (`sensor.lammitys_tavoite_*`). Sen päälle ennakoiva, korotus ja hetki-raja (`sensor.lammitys_kaytto_*`). Olo+keittiön lattia on silti taustalla paitsi ennakoivassa.

`sensor.lammitys_huone_max` = korkein aktiivinen huoneasetus (ikkuna/ovi auki tai Pois ei nosta).
`sensor.lammitys_vesi_huone_raja` = huone_max + 5 °C. Olo 21 °C → 26 °C.

`sensor.lammitys_sekoitus_kaytto` = max(huone + 5, ulkokäyrä + (huone − 21)), katto `lammitys_kayra_meno_max`.

- Huone nousee (halpa, ennakoiva, korotus) → vesi nousee.
- Huone laskee (kallis, hetkellinen) → vesi laskee.
- Ulkokäyrä pitää veden riittävän kuumana pakkasella (35…48 °C viite 21 °C:n huoneelle).
- Sama luku kirjoitetaan varaajan termostaatille.

## 5. Huoneiden lattiat

Jokaisella alueella Automaatti / Pois.

Kirjoitettava asetus:

| Tilanne | Olo+keittiö | Muut |
|---|---|---|
| Pois, ikkuna/ovi auki | 17 °C | 17 °C |
| Hetkellinen ≥ 40 c/t | tausta − 2 °C, min 17 | käyttö − 2 °C, min 17 |
| Huone alarajalla, ikkuna/ovi kiinni | käyttö, min 19 °C | käyttö, min 19 °C (eteinen 20) |
| Ennakoiva | käyttö + nosto, max 26 | käyttö + nosto, max 26 |
| Korotus-ajastin (+4 °C / 240 min) | tavoite + korotus | tavoite + korotus |
| Normaali | tausta 18 °C | käyttö (20 / 23) |

Sitten portti: `max(varaaja, menovesi) ≥ huoneasetus + 5 °C`.

Esimerkki: olo 21 °C → vesi vähintään 26 °C, muuten lattia kirjoitetaan 17 °C. Vesi ei nosta huonetta.

Poikkeus: `binary_sensor.lammitys_vastus_nostaa` (vastus Automaatti, ei hetki-kieltoa, KV < 58 °C) → huoneiden asetus ja kierto pidetään, jotta vastus saa virtauksen.

Toinen poikkeus: `binary_sensor.lammitys_huone_alaraja`. Jos mitattu huone < 19 °C (eteinen < 20 °C) ja ikkuna/ovi on kiinni, rajoitukset ohitetaan (hetkellinen −2 °C, vastuskielto, vesi+5 pois) kunnes huone on +0.5 °C yli alarajan. Ikkuna auki tai Pois ei ohita.

Kiertopumppu päälle jos jokin lattia oikeasti lämmittää, vastus on nostamassa vettä, tai varaaja kutsuu ja KV on kylmä. Lattiatarve pois → vastus heti pois, kierto 120 s jäähdytykseen.

## 6. Hinta ja hetkellinen — mitä liikkuu

Spot (`sensor.energi_data_service`):

- liikuttaa huoneiden `tavoite_*`-asetusta
- kytkee ennakoivan (kaytto nousee) → menovesi ja varaaja seuraavat
- suuri heilunta: tuleva keski ≥ nyt + 8 c → painopiste lattiassa
- ILP:n asetus käyrä + `keittio_ilp_lampo`. Kompressoria ei sammuteta hinnalla

Hetkellinen c/t (`sensor.hetkellinen_kustannus`):

- on jo `tavoite_*`-käyrässä (kulutusvaikutus)
- ≥ 40: lisäksi huoneiden kaytto −2 °C (hystereesi pois ≤ 35) → menovesi laskee mukana
- ≥ 50: vastus kielletty (hystereesi pois ≤ 45)
- korotus ohittaa huonerajoituksen
- huoneen alaraja (ikkuna kiinni) ohittaa huone- ja vastusrajoituksen
- ILP:tä ei sammuteta hinnalla

## 7. Keittiö ILP

- Automaatti / Pois / Käsi.
- Automaatti lämmityskaudella: `heat` päällä, asetus liikkuu. Ainoat off-tilat: Pois tai terassin ovi.
- Ovi auki > 2 min → off. Oven takia pois vähintään 5 min.
- Jäähdytys vain jos 24 h ulkokeski ≥ `keittio_ilp_jaahdytys_keski` (18 °C) ja ulko ≥ 20 °C. Kausivaihto 4 h viive. 16–20 °C: kausi ei vaihdu.
- Puhallin: lähellä asetusta quiet, kaukana high.
- Ei lämmitä makuuhuoneita.

## 8. Ilmanvaihto (AirFi)

- Hub `airfi` (`modbus.yaml`). Ei holding 2 = 1.
- Automaatti / Käsi / Tehostus / Pois.
- Automaatti: tulo = suurin antureista (CO2, kosteus, PM), poisto = tulo + 5 %. Oletus kaikki kolme.
- CO2: `sensor.olohuone_ilmanlaatu_anturi_carbon_dioxide` (kortissa `sensor.iv_co2`).
- Minimi auto 25 %. Hystereesi 5 %, max ±5–15 %/kirjoitus, vähintään 5 min väli.
- Pois = hätäseis (holding 1), ei nopeus 0 %.
- LTO-ohituspelti (h46 asetus, h47 ulkoraja, h48 viive): vapaa jäähdytys vain kun lämmitystä ei tarvita.
- Jos ILP lämmittää, lattia kutsuu tai ennakoiva on päällä → koneelle ulkoraja 25 °C. Apuri `iv_ohitus_ulko` ei muutu. IV ei jäähdytä vastaan.

## 9. Mitä tämä ei tee

- Ei ohjaa VILP:ää suoraan. KV:n lämpö tulee sieltä tai muualta; ohjaus vain varastaa sitä pulssilla.
- Ei käytä virtuaalikytkintä lämmittimenä.
- Menovesi ja varaajan termostaatti seuraavat huone + 5 °C ja käyrän siirtoa. Ei erillistä hintakorjausta menovedessä (se tulisi kahdesti).

## 10. Tarkista nämä

1. Sekoituspumppu tosiaan KV → varaaja, ei suoraan menoveteen?
2. Vastus tosiaan menoveden läpivirtauksessa, ei varaajan kyljessä?
3. `climate.lattialammitys` mittaa varaajaa (13), ei menovettä (10)?
4. Onko 21 °C oikea viitelämpö käyrän siirrolle (huone − 21)?
5. Hetkellinen laskee huonetta ja sen myötä vettä. Riittääkö?
6. Onko aurinkopiiri sama ~300 l varaaja (13)?
7. Korotus-apurit: jos vanhat 1,5 °C / 60 min jäivät, täysi uudelleenkäynnistys siirtää ne +4 °C / 240 min. Itse muutettua arvoa ei ylikirjoiteta.
