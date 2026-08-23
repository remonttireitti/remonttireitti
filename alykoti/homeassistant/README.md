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
| `iv.yaml` | Valinnainen IV-käsinajo. **Ei** `modbus:`-hubia. Kirjoitus oletuksena pois. |
| `modbus.yaml` | Ainoa AirFi-hubi (`name: airfi`). Pidä live-tiedosto jos se jo toimii. |

**Poista HA:sta vanhat** `energia-kokonaisteho.yaml` ja `energia-vertailu.yaml` (yhdysviiva).

AirFi-yhteys on **vain** `configuration.yaml` → `modbus: !include modbus.yaml`.
Jos `packages/iv.yaml` sisältää `modbus:`-avaimen, poista se ja käynnistä HA uudelleen.
Lovelace-kortti `lovelace/lovelace-iv.yaml` näyttää `sensor.airfi_*`. Käsinajo on erillinen `lovelace-iv-ohjaus.yaml`.

```yaml
homeassistant:
  packages: !include_dir_named packages
```
