# Alykoti Yellow — keskusyksikkö (Raspberry Pi)

Modbus RTU → IV-kone, Zigbee2MQTT, Z-Wave paikallisesti.  
Tila ja komennot **HTTPS → alykoti.vercel.app**.

## 1. Web — rekisteröi hub

1. Avaa **Keskusyksikkö** → lisää laite  
2. Kopioi **device token**

## 2. Yellow — asenna

```bash
sudo apt install -y python3-venv python3-pip git
mkdir -p ~/alykoti-yellow
# kopioi repo-kansio alykoti/yellow → ~/alykoti-yellow (scp/rsync)

cd ~/alykoti-yellow
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
nano .env   # ALYKOTI_DEVICE_TOKEN=...
```

## 3. Modbus RTU (MAX485 → IV-kone)

| Parametri | Arvo |
|-----------|------|
| Sarjaportti | `AIRFI_MODBUS_SERIAL` (esim. `/dev/ttyAMA2` tai `/dev/ttyUSB1`) |
| Nopeus | 9600 8N1 |
| ID | 1 |
| Kaapeli | MODBUS A, B, GND |

**Huom:** `ttyAMA0` = Z-Pi 7, `ttyUSB0` = SkyConnect — älä käytä samoja.

Testaa:

```bash
source .venv/bin/activate
python -c "
from alykoti_yellow.modbus_airfi import read_airfi
print(read_airfi('/dev/ttyAMA2', 9600, 1))
"
```

## 4. Käynnistä synkki

```bash
source .venv/bin/activate
python -m alykoti_yellow.main
```

Systemd:

```bash
sudo cp install/alykoti-yellow.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now alykoti-yellow
journalctl -u alykoti-yellow -f
```

## 5. Kirjoitus IV:hen

Oletus **vain luku** (`AIRFI_WRITES_ENABLED=0`).  
Kun Modbus-luku vakaata, aseta `AIRFI_WRITES_ENABLED=1` ja restart.

## Ympäristömuuttujat

| Muuttuja | Kuvaus |
|----------|--------|
| `ALYKOTI_DEVICE_TOKEN` | Pakollinen |
| `ALYKOTI_SYNC_URL` | `https://alykoti.vercel.app/api/device/sync` |
| `SYNC_INTERVAL_SEC` | 30 |
| `AIRFI_MODBUS_SERIAL` | RS485-portti |
| `AIRFI_WRITES_ENABLED` | 0/1 |
| `MQTT_URL` | `mqtt://127.0.0.1:1883` |
