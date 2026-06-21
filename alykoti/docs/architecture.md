# Älykoti-arkkitehtuuri

## Roolit

| Laite | Rooli |
|-------|--------|
| **Home Assistant Yellow (Pi OS)** | **Keskusyksikkö / hub** — Zigbee, Z-Wave, Modbus RTU → IV-kone, MQTT, synkki webiin |
| **alykoti/web** | **Pää-UI** — ohjaus, seuranta, automatiot (Supabase + API) |
| **Guition ESP32 (näyttö)** | **Käyttöpääte** — paikallinen näyttö + kosketus, ei keskuslogiikkaa |
| ~~ESP32-C3 satelliitti~~ | **Ei tarvita**, jos Yellow hoitaa Modbus RTU:n koneeseen |

```
  Puhelin / PC                    Käyttöpääte (keittiö)
  alykoti.vercel.app  ◄────►  Guition ESP32 (näyttö)
         ▲                              ▲
         │ HTTP / Supabase              │ WiFi (tila + komennot)
         ▼                              │
  ┌──────────────────────────────────────┴───┐
  │     Home Assistant Yellow (Pi OS)        │
  │  Mosquitto · Zigbee2MQTT · Z-Wave JS UI  │
  │  Modbus RTU (MAX485) ────────────────────┼──► IV-kone (AirFi)
  │  SkyConnect (Zigbee) · Z-Pi 7 (Z-Wave)   │
  └──────────────────────────────────────────┘
```

## Yellow (keskusyksikkö)

Pyörii **Raspberry Pi OS**:llä (ei Home Assistantia).

| Palvelu | Portti / laite | Tehtävä |
|---------|----------------|---------|
| Mosquitto | 1883 | Sisäinen viestiväylä |
| Zigbee2MQTT | SkyConnect USB | Valot, IKEA, Hue… |
| Z-Wave JS UI | GPIO Z-Pi 7 (`ttyAMA0`) | Z-Wave-laitteet |
| **Modbus RTU → AirFi** | MAX485 (tulossa) | Lämpötilat, tuulettimet — **vain luku aluksi** |
| Synkki-palvelu (tulossa) | → Supabase / web API | Tila ulos, komennot sisään |

Yellow voi olla **sähkökaapissa** IV-koneen vieressä (RS485 lyhyt matka) tai kiinteässä paikassa pitkällä RS485-kaapelilla.

## Web (pää-UI)

| Osio | Lähde |
|------|--------|
| **Koti / Valot** | Zigbee2MQTT MQTT (`/koti/valot`) |
| **Ilmanvaihto** | Yellow Modbus → API (tulossa) |
| **Z-Wave** | Z-Wave JS UI tai MQTT-silta (tulossa) |
| **Keskusyksikkö** | Yellow rekisteröinti, tila, token |

Web on **ensisijainen ohjaus**. Vercel ei näe kotiverkkoa suoraan — synkki Yellow → Supabase (kuten nykyinen hub-polku).

## Guition ESP32 — käyttöpääte

- **Ei** Modbus-masteria IV-koneeseen
- **Ei** Zigbee/Z-Wave-koordinaattoria
- Näyttää: ilmanvaihto, CO₂, sähkö, valot (Yellow/webistä)
- Kosketus: lähetä komennot Yellowille tai web-API:lle
- Nykyinen `vent-display.yaml` / kosketus **säilytetään** — data tulee Yellowilta

Firmware-suunta: ESPHome-client joka pollaa Yellowin HTTP/MQTT:tä tai Supabase-komentoja.

## Ilmanvaihto (AirFi)

| Vanha suunnitelma | Uusi |
|-------------------|------|
| Guition hub Modbus TCP 192.168.50.26:502 | **Yellow Modbus RTU** koneen MODBUS A/B |
| ESP32-C3 satelliitti + ESP-NOW | **Ei tarvita** |
| HA välikappaleena | **Ei HA:ta** |

Modbus: **9600 8N1**, ID 1, input-rekisterit 4,6,7,8 (T1,T3,T4,T5), 11,12 (tuulettimet). **Kirjoitus pois** kunnes luku toimii.

## Zigbee & Z-Wave

Jo Yellowilla:

- Zigbee: SkyConnect + Zigbee2MQTT → web `/koti/valot`
- Z-Wave: Aeotec Z-Pi 7 + Z-Wave JS UI

## Supabase

- `hubs` — Yellow rekisteröidään keskusyksiköksi (IP, token)
- `commands` — web → Yellow
- `satellite_devices` — ei ESP-NOW-satelliitteja tässä mallissa (tai Guition merkitään eri roolilla)

## Seuraavat toteutusaskeleet

1. **Yellow:** MAX485 + Modbus-lukupalvelu (Python/Node) → MQTT tai suoraan web-sync
2. **Web:** ilmanvaihto-data Yellowista (ei Modbus TCP / ei Guition hub -synkkiä AirFiin)
3. **Guition:** kevennä firmware — poista Modbus-kirjoitukset, näytä data API:sta
4. **Poista riippuvuus:** HA, AirFi Modbus TCP hubista, C3-satelliittisuunnitelma
