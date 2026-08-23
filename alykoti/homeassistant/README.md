# Home Assistant -paketit

`!include_dir_named packages` käyttää **tiedostonimeä slugina**.
Yhdysviiva `-` on kielletty. Käytä vain `a-z`, `0-9` ja `_`.

## Tiedostot (`config/packages/`)

| Tiedosto | Huom |
|----------|------|
| `keittio_ilp.yaml` | Keittiö ILP |
| `aurinkolampo.yaml` | Aurinkolämpö kWh |
| `energia_kokonaisteho.yaml` | L1+L2+L3 |
| `energia_vertailu.yaml` | Vertailu kWh |
| `iv.yaml` | IV käsi + auto (CO2/kosteus/PM). **Ei** `modbus:`-hubia. Kirjoitus oletuksena pois. |
| `modbus.yaml` | Ainoa AirFi-hubi (`name: airfi`). Pidä live-tiedosto jos se jo toimii. |

**Poista HA:sta vanhat** `energia-kokonaisteho.yaml` ja `energia-vertailu.yaml` (yhdysviiva).

AirFi-yhteys on **vain** `configuration.yaml` → `modbus: !include modbus.yaml`.
Jos `packages/iv.yaml` sisältää `modbus:`-avaimen, poista se ja käynnistä HA uudelleen.
Lovelace `lovelace-iv.yaml` on käyttöpääte: tila, P/T %, auto-tavoite,
anturivalinta, CO2/RH/PM, Auto/Käsi/Teho/Pois. Liukusäätimet vain Käsi-tilassa,
hälytys vain kun hätäseis/vika > 0.

```yaml
homeassistant:
  packages: !include_dir_named packages
```
