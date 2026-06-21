import os
from pathlib import Path


def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DEVICE_TOKEN = os.environ.get("ALYKOTI_DEVICE_TOKEN", "").strip()
SYNC_URL = os.environ.get(
    "ALYKOTI_SYNC_URL", "https://alykoti.vercel.app/api/device/sync"
).strip()
SYNC_INTERVAL_SEC = max(10, int(os.environ.get("SYNC_INTERVAL_SEC", "30")))

AIRFI_SERIAL = os.environ.get("AIRFI_MODBUS_SERIAL", "/dev/ttyAMA2").strip()
AIRFI_BAUD = int(os.environ.get("AIRFI_MODBUS_BAUD", "9600"))
AIRFI_UNIT = int(os.environ.get("AIRFI_MODBUS_UNIT", "1"))
AIRFI_WRITES = os.environ.get("AIRFI_WRITES_ENABLED", "0").strip() in ("1", "true", "yes")
AIRFI_ENABLED = os.environ.get("AIRFI_ENABLED", "0").strip() in ("1", "true", "yes")

MQTT_URL = os.environ.get("MQTT_URL", "mqtt://127.0.0.1:1883").strip()
MQTT_PREFIX = os.environ.get("SKYCONNECT_TOPIC_PREFIX", "zigbee2mqtt").strip()
ZWAVE_PREFIX = os.environ.get("ZWAVE_TOPIC_PREFIX", "zwave").strip()
ZWAVE_NODES_JSON = os.environ.get(
    "ZWAVE_NODES_JSON", "/home/ek/zwave-zigbee/zwave-js-ui/nodes.json"
).strip()
ZWAVE_GATEWAY = os.environ.get("ZWAVE_GATEWAY_NAME", "Mosquitto").strip()

FIRMWARE_VERSION = "yellow-1.0.0"
