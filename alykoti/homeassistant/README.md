# Home Assistant -paketit ja Lovelace

Kopioi tiedostot Home Assistantin levylle. GitHubissa oleva tiedosto ei ole HA:ssa ennen kopiointia.

## 1. Paketit (`config/packages/`)

Kopioi:

- `packages/packages-aurinkolampo.yaml`
- `packages/packages-keittio_ilp.yaml` (jos käytössä)

`configuration.yaml` tarvitsee:

```yaml
homeassistant:
  packages: !include_dir_named packages
```

Sitten: **Asetukset → Järjestelmä → YAML-konfiguraation lataus**
(tai käynnistä HA uudelleen).

Aurinkolämmön kWh-luvut alkavat nollasta. Eilinen näkyy vasta ensimmäisen keskiyön jälkeen.

## 2. Lovelace

Avaa lämmitysnäkymän kortti → **Edit → Show code editor**.

Korvaa **koko** YAML tiedostolla:

`lovelace/lovelace-lammitys.yaml`

Älä liitä palasia chip-listan keskelle.

## Entityt (aurinkolämpö)

| Entity | Merkitys |
|--------|----------|
| `sensor.aurinkolampo_teho_kw` | hetkellinen kW (jo olemassa) |
| `sensor.aurinkolampo_energia` | kumulatiivinen kWh |
| `sensor.aurinkolampo_tuotto_tanaan` | tänään kWh |
| `sensor.aurinkolampo_tuotto_eilen` | eilen kWh |
| `sensor.aurinkolampo_tuotto_viikko` | kuluva viikko kWh |
| `sensor.aurinkolampo_tuotto_kuukausi` | kuluva kuukausi kWh |

## "Failed to load file / not_found"

HA:n editori avasi polun jota ei ole HA:n levyllä. Kopioi tiedosto ensin `config/packages/`-kansioon.
