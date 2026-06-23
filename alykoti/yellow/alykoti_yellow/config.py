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
COMMAND_POLL_INTERVAL_SEC = max(
    1,
    int(os.environ.get("COMMAND_POLL_INTERVAL_SEC", os.environ.get("COMMAND_POLL_SEC", "2"))),
)
COMMAND_POLL_ENABLED = os.environ.get("COMMAND_POLL_ENABLED", "1").strip() in (
    "1",
    "true",
    "yes",
)

AIRFI_MODBUS_HOST = os.environ.get("AIRFI_MODBUS_HOST", "").strip() or None
AIRFI_MODBUS_PORT = int(os.environ.get("AIRFI_MODBUS_PORT", "502"))
AIRFI_SERIAL = os.environ.get("AIRFI_MODBUS_SERIAL", "").strip() or None
AIRFI_BAUD = int(os.environ.get("AIRFI_MODBUS_BAUD", "9600"))
AIRFI_UNIT = int(os.environ.get("AIRFI_MODBUS_UNIT", "1"))
AIRFI_CONNECT_TIMEOUT_SEC = float(os.environ.get("AIRFI_CONNECT_TIMEOUT_SEC", "4"))
AIRFI_READ_TIMEOUT_SEC = float(os.environ.get("AIRFI_READ_TIMEOUT_SEC", "5"))
AIRFI_RETRY_COUNT = max(0, int(os.environ.get("AIRFI_RETRY_COUNT", "1")))
AIRFI_RETRY_DELAY_SEC = float(os.environ.get("AIRFI_RETRY_DELAY_SEC", "0.5"))
AIRFI_OFFLINE_BACKOFF_MAX_SEC = float(os.environ.get("AIRFI_OFFLINE_BACKOFF_MAX_SEC", "180"))
AIRFI_OFFLINE_SKIP_AFTER = max(1, int(os.environ.get("AIRFI_OFFLINE_SKIP_AFTER", "3")))
AIRFI_WRITES = os.environ.get("AIRFI_WRITES_ENABLED", "0").strip() in ("1", "true", "yes")
# TCP ensisijainen jos host asetettu, muuten sarja
_default_airfi = "1" if (AIRFI_MODBUS_HOST or AIRFI_SERIAL) else "0"
AIRFI_ENABLED = os.environ.get("AIRFI_ENABLED", _default_airfi).strip() in ("1", "true", "yes")

MQTT_URL = os.environ.get("MQTT_URL", "mqtt://127.0.0.1:1883").strip()
MQTT_PREFIX = os.environ.get("SKYCONNECT_TOPIC_PREFIX", "zigbee2mqtt").strip()
ZWAVE_PREFIX = os.environ.get("ZWAVE_TOPIC_PREFIX", "zwave").strip()
ZWAVE_NODES_JSON = os.environ.get(
    "ZWAVE_NODES_JSON", "/home/ek/zwave-zigbee/zwave-js-ui/nodes.json"
).strip()
ZWAVE_GATEWAY = os.environ.get("ZWAVE_GATEWAY_NAME", "Mosquitto").strip()

FIRMWARE_VERSION = "yellow-1.1.0"


def airfi_kwargs() -> dict:
    return {
        "host": AIRFI_MODBUS_HOST,
        "tcp_port": AIRFI_MODBUS_PORT,
        "serial": AIRFI_SERIAL,
        "baud": AIRFI_BAUD,
        "unit": AIRFI_UNIT,
        "connect_timeout": AIRFI_CONNECT_TIMEOUT_SEC,
        "read_timeout": AIRFI_READ_TIMEOUT_SEC,
        "retry_count": AIRFI_RETRY_COUNT,
        "retry_delay_sec": AIRFI_RETRY_DELAY_SEC,
    }


def airfi_write_kwargs() -> dict:
    """Modbus-kirjoitus — ei retry_count (eri kuin read_airfi)."""
    return {
        "host": AIRFI_MODBUS_HOST,
        "tcp_port": AIRFI_MODBUS_PORT,
        "serial": AIRFI_SERIAL,
        "baud": AIRFI_BAUD,
        "unit": AIRFI_UNIT,
        "connect_timeout": AIRFI_CONNECT_TIMEOUT_SEC,
        "read_timeout": AIRFI_READ_TIMEOUT_SEC,
    }
