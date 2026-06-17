# Älykoti-arkkitehtuuri

## Keskusyksikkö (Guition ESP32-P4)

Yksi laite koko kodissa. Se **ei ole** ilmanvaihtokone eikä pelkkä anturi.

```
                    ┌─────────────────────┐
                    │   Keskusyksikkö     │
                    │   ESP32-P4 + C6     │
                    │   Ethernet / WiFi   │
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           │                   │                   │
     ESP-NOW (tulossa)    HTTP synkki          (ei BLE)
           │                   │                   │
    ┌──────┴──────┐      ┌─────┴─────┐      ┌─────┴─────┐
    │  Satelliitit │      │  AirFi IV │      │ Airthings │
    │ anturit jne │      │ Modbus TCP│      │ (pilvi)   │
    │             │      │ LAN :502  │      │           │
    └─────────────┘      └───────────┘      └───────────┘
```

## Web-osiot

| Osio | Mitä hallitsee |
|------|----------------|
| **Keskusyksikkö** | Laite, yhteys, token, ESP-NOW-laitteet |
| **Ilmanvaihto** | Yksi automaatiomoduuli (CO₂ → AirFi) |
| Lämmitys / Valaistus | Tulossa, omat moduulit |

## ESP-NOW (seuraava vaihe)

Keskusyksikkö toimii ESP-NOW-masterina. Satelliitit (ESP32/ESP8266) raportoivat
anturidataa ilman WiFiä jokaiselle laitteelle erikseen.

Tietokanta: `satellite_devices` (hub_id + mac_address).

Firmware: `espnow:`-komponentti lisätään `hub.yaml`:ään kun ensimmäinen
satelliitti on valmis.

## Supabase

- `hubs` — keskusyksiköt (aiemmin `controllers`)
- `commands` — etäkomennot hubille
- `satellite_devices` — ESP-NOW-parit (valmis skeema, UI tulossa)
