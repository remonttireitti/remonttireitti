# Paikalliset automaatiot (Yellow)

Yellow suorittaa automaatiot **tästä kansiosta** — Zigbee, Z-Wave ja LAN-laitteet
toimivat ilman Verceliä, Supabasea tai internetiä.

| Tiedosto | Sisältö |
|----------|---------|
| `automations.json` | Automaatiosäännöt (lista) |
| `integrations.json` | Shelly/Tasmota-hostit LANissa |
| `hub_config.json` | Lämmitys, tuuletus jne. (valinnainen) |
| `control_mode.json` | `{"mode":"auto"}` (valinnainen) |

Kun web synkkaa onnistuneesti, Yellow päivittää nämä tiedostot automaattisesti.
Käynnistyksessä luetaan aina **local/** ensin.
