# Keskusyksikkö: Guition JC-ESP32P4-M3

Tunniste kuvasta: **JC1060P470C_I_W_Y** / **JC-ESP32P4-M3**

## Piirustus

| Komponentti | Huomio |
|-------------|--------|
| **ESP32-P4** | RISC-V, ei sisäänrakennettua WiFi/BLE |
| **ESP32-C6** | WiFi 6 + Bluetooth — Airthings BLE tämän kautta |
| **Ethernet** | RJ45 — suositeltu Modbus/verkko-yhteyteen |
| **20-pin header** | GPIO, UART — RS485 Modbus AirFiin |
| **JST-liittimet** | J1–J6 — tarkista Guition-dokumentaatiosta |
| **microSD** | Paikallinen loki (valinnainen) |
| **RTC-paristo** | Kellonaika sähkökatkossa |

## Modbus RS485

AirFi IV: **38400 8N1**, Unit ID 1, RS485 A/B.

MAX485 kytketään vapaisiin UART-GPIOihin (tarkista Guition-pinout).
Firmware-esimerkissä oletus:

```
TX  → GPIO17
RX  → GPIO16
DE/RE → GPIO4
```

**Vahvista pinnit** JC1060P470C-skeemasta ennen juottamista — P4-alustan
oletuspinnit voivat poiketa ESP32-WROOMista.

## Firmware-alusta

Tämä laite on **ESP32-P4**, ei klassinen ESP32-WROOM. Vaihtoehdot:

1. **ESPHome** (esp32-p4 target, C6 WiFi-proxy) — nopea prototyyppi
2. **Guition ESP-IDF SDK** — näyttö + kosketus integroitu
3. **PlatformIO + ESP-IDF** — täysi kontrolli

Nykyinen `airquality-controller.yaml` on ESPHome-logiikkapohja. Päivitä
`board:` ja pinnit ennen flashausta:

```yaml
esp32:
  board: esp32-p4-evboard   # tai Guitionin board-määritys
```

Näyttöohjaus (LVGL) voidaan lisätä myöhemmin — ensin BLE + Modbus + Supabase-synkki.

## Verkko

Suositus kotikäyttöön:

- **Ethernet** kiinteään yhteyteen (AirFi + Supabase-synkki)
- **WiFi** varayhteys

`sync_url` osoittaa **alykoti/web**-sovelluksen API:in, ei Remonttireittiin.
