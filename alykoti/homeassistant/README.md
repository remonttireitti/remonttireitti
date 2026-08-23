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
Lovelace-kortti `lovelace/lovelace-iv.yaml` näyttää `sensor.airfi_*` ja
`input_select.iv_auto_anturit` (seitsemän auto-yhdistelmää). Vain valittu
`automation.iv_auto_*` on päällä. CO2/PM-entiteetit: `input_text.iv_co2_entiteetti`
ja `input_text.iv_pm_entiteetti` (oletus `sensor.iv_co2_skaala` / `sensor.iv_pm_skaala`).
Kosteus oletuksena `sensor.airfi_kosteus_rh`.

```yaml
homeassistant:
  packages: !include_dir_named packages
```
