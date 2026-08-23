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
Lovelace `lovelace-iv.yaml` on käyttöpääte: tila, P/T %, anturivalinta,
liukusäätimet, **Aseta nopeudet** (script.iv_kirjoita), Auto/Käsi/Teho/Pois.
Korvaa koko kortti. Käynnistä HA uudelleen Modbus-muutoksen jälkeen.

```yaml
homeassistant:
  packages: !include_dir_named packages
```
