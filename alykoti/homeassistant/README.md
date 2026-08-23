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
| `iv.yaml` | IV käsi + auto. **Ei** `modbus:`-hubia. Korvaa koko tiedosto, älä yhdistä. |
| `modbus.yaml` | Ainoa AirFi-hubi (`name: airfi`). Pidä sama IP. Tarvitsee `numbers:`-lohkon (h8/h10/h11) tai nopeus ei muutu. |

**Poista HA:sta vanhat** `energia-kokonaisteho.yaml` ja `energia-vertailu.yaml` (yhdysviiva).

AirFi-yhteys on **vain** `configuration.yaml` → `modbus: !include modbus.yaml`.
Jos `packages/iv.yaml` sisältää `modbus:`-avaimen, poista se ja käynnistä HA uudelleen.
Lovelace `lovelace-iv.yaml` on käyttöpääte: P/T %, Aseta-chip,
Auto/Käsi/Teho/Pois/Sauna. Ei isoa nappikorttia. Korvaa koko kortti.

```yaml
homeassistant:
  packages: !include_dir_named packages
```
