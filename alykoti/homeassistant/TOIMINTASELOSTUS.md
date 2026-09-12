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

1. Aurinko, jos kenno on kuumempi kuin varaaja (ero > 7 °C). Silloin sekoituspumppu ei kilpaile, jos aurinkoteho on yli rajan.
2. Sekoituspumppu, jos KV ≥ 58 °C ja KV on vähintään ~1,5 °C kuumempi kuin varaaja.
3. Läpivirtausvastus, jos KV on liian kylmä varastettavaksi, kierto on käynyt ≥ 4 min, ja joko jokin lattia lämmittää tai varaaja kutsuu lämpöä.

Käyttöveden suoja: sekoituspulssi 30 s, sitten 90 s odotus. Pois heti jos KV ≤ 56 °C tai KV laskee pulssin aikana liikaa.

## 3. Varaajan termostaatti

`climate.lattialammitys` pidetään `heat`-tilassa. Sille kirjoitetaan tavoite:

- perus = menoveden käyrä `sensor.lammitys_sekoitus_kaytto`
- ennakoivassa + `lammitys_hinta_nosto_max` (katto `lammitys_kayra_meno_max`)

Kun varaaja on alle tavoitteen, termostaatti näyttää heating ja virtuaalikytkin menee päälle. Se ei ole lämpö. Oikea lämpö:

- KV kuuma → sekoituspumppu lataa varaajaa
- KV kylmä → kiertopumppu päälle, 4 min jälkeen vastus pulssittaa menovettä (15 s / 30 s)

Vastus ei käy, jos kaikki huoneet ovat Pois eikä ennakoiva ole päällä. Hetkellinen ≥ 50 c/t kieltää vastuksen.

## 4. Menoveden tavoite (käyrä)

`sensor.lammitys_sekoitus_kaytto` ei ole huone + 5 °C. Se on ulkolämpökäyrä:

- ulko lämmin (`lammitys_kayra_ulko_vih`, oletus 18 °C) → meno min (`lammitys_kayra_meno_min`, oletus 35 °C)
- ulko kylmä (`lammitys_kayra_ulko_kylma`, oletus −25 °C) → meno max (`lammitys_kayra_meno_max`, oletus 48 °C)
- väli lineaarisesti

Sitten spot nyt + seuraavat tunnit (`lammitys_hinta_ennakko_h`, oletus 6 h):

- halpa / hinta nousemassa → käyrää nostetaan (max `lammitys_hinta_nosto_max`)
- kallis / halvempaa tulossa → käyrää lasketaan (max `lammitys_hinta_rajoitus_max`)

Hetkellinen kulutus (`sensor.hetkellinen_kustannus`) ei suoraan liikuta tätä käyrää. Se rajoittaa huoneita ja kieltää vastuksen.

## 5. Huoneiden lattiat

Jokaisella alueella Automaatti / Pois.

Kirjoitettava asetus:

| Tilanne | Olo+keittiö | Muut |
|---|---|---|
| Pois, ikkuna/ovi auki | 17 °C | 17 °C |
| Hetkellinen ≥ 40 c/t | tausta − 2 °C, min 17 | käyttö − 2 °C, min 17 |
| Ennakoiva | käyttö + nosto, max 26 | käyttö + nosto, max 26 |
| Korotus-ajastin | tavoite + korotus | tavoite + korotus |
| Normaali | tausta 18 °C | käyttö (20 / 23) |

Sitten portti: `max(varaaja, menovesi) ≥ huoneasetus + 5 °C`.

Esimerkki: olo 21 °C → vesi vähintään 26 °C, muuten lattia kirjoitetaan 17 °C. Vesi ei nosta huonetta.

Poikkeus: `binary_sensor.lammitys_vastus_nostaa` (vastus Automaatti, ei hetki-kieltoa, KV < 58 °C) → huoneiden asetus ja kierto pidetään, jotta vastus saa virtauksen.

Kiertopumppu päälle jos jokin lattia oikeasti lämmittää, vastus on nostamassa vettä, tai varaaja kutsuu ja KV on kylmä. Lattiatarve pois → vastus heti pois, kierto 120 s jäähdytykseen.

## 6. Hinta ja hetkellinen — mitä liikkuu

Spot (`sensor.energi_data_service`):

- liikuttaa menoveden käyrää
- kytkee ennakoivan, kun tuleva 6 h keski > nyt + 1,5 °C-logiikka (halpa tai nosto)
- suuri heilunta: tuleva keski ≥ nyt + 8 c → painopiste lattiassa, varaajaa silti vähän yli
- ILP:n asetus käyrä + `keittio_ilp_lampo` (kallis sähkö → ILP:tä voi nostaa, kompressoria ei sammuteta)

Hetkellinen c/t (`sensor.hetkellinen_kustannus`):

- ≥ 40: huoneiden lattia-asetus −2 °C (hystereesi pois ≤ 35)
- ≥ 50: vastus kielletty (hystereesi pois ≤ 45)
- korotus ohittaa huonerajoituksen
- ei liikuta varaajan/käyrän lukemaa suoraan
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
- Menoveden käyrä ei seuraa huone + 5 °C. Huone + 5 on vain portti: saako lattia yrittää. Käyrä on ulko + spot.
- Hetkellinen kulutus ei laske varaajan termostaatin lukemaa.

## 10. Tarkista nämä

1. Sekoituspumppu tosiaan KV → varaaja, ei suoraan menoveteen?
2. Vastus tosiaan menoveden läpivirtauksessa, ei varaajan kyljessä?
3. `climate.lattialammitys` mittaa varaajaa (13), ei menovettä (10)?
4. Pitäisikö menoveden tavoitteen seurata huone + 5 °C (ja hinnan/kulutuksen muuttamaa huonetta), ei vain ulkokäyrää?
5. Pitäisikö hetkellisen kulutuksen laskea myös varaajan/käyrän tavoitetta, ei vain huoneita ja vastusta?
6. Onko aurinkopiiri sama varaaja (13)?
