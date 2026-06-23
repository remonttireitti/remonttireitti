"""Zigbee2MQTT — laitteet ja ominaisuudet paikallisesta Mosquitto-brokerista."""

from __future__ import annotations

import json
import logging
import threading
import time
from typing import Any
from urllib.parse import urlparse

import paho.mqtt.client as mqtt

log = logging.getLogger(__name__)

CONTROL_IDS = {"switch", "dimmer", "color", "lock", "relay", "fan", "cover"}

# Ei valo-/kytkinohjausta (esim. Aqara W100 thermostat_mode).
_SKIP_SWITCH_NAMES = frozenset(
    {
        "thermostat_mode",
        "system_mode",
        "sensor",
        "identify",
        "auto_hide_middle_line",
    }
)
_SKIP_BINARY_NAMES = _SKIP_SWITCH_NAMES

_W100_MODELS = frozenset({"TH-S04D"})

# Estää Z2M "timed out after 10000ms" kun komentoja tulvii peräkkäin.
_MIN_PUBLISH_INTERVAL_SEC = 0.45
_last_publish: dict[str, float] = {}
_publish_lock = threading.Lock()


def _parse_mqtt_url(url: str) -> tuple[str, int]:
    parsed = urlparse(url)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 1883
    return host, port


def _cap(id_: str, read: bool = True, write: bool = False) -> dict[str, Any]:
    return {"id": id_, "read": read, "write": write}


def _merge_cap(caps: dict[str, dict[str, Any]], cap: dict[str, Any]) -> None:
    id_ = cap["id"]
    if id_ in caps:
        caps[id_]["read"] = caps[id_]["read"] or cap["read"]
        caps[id_]["write"] = caps[id_]["write"] or cap["write"]
    else:
        caps[id_] = dict(cap)


def _access_rw(access: int | None, default_write: bool = False) -> tuple[bool, bool]:
    if access is None:
        return True, default_write
    can_read = bool(access & 1) or access == 0
    can_write = bool(access & 2) or default_write
    return can_read, can_write


def _device_model(device: dict[str, Any]) -> str:
    definition = device.get("definition") if isinstance(device.get("definition"), dict) else {}
    return str(device.get("model_id") or definition.get("model") or "").upper()


def _device_description(device: dict[str, Any]) -> str:
    definition = device.get("definition") if isinstance(device.get("definition"), dict) else {}
    return str(definition.get("description") or "").upper()


def _is_w100_climate_sensor(device: dict[str, Any]) -> bool:
    model = _device_model(device)
    if model in _W100_MODELS:
        return True
    return "W100" in _device_description(device) or "CLIMATE SENSOR W100" in _device_description(device)


def _discover_capabilities(device: dict[str, Any]) -> list[dict[str, Any]]:
    if device.get("type") == "Coordinator":
        return []
    caps: dict[str, dict[str, Any]] = {}
    exposes = device.get("definition", {}).get("exposes", [])

    def add(id_: str, read: bool = True, write: bool = False) -> None:
        _merge_cap(caps, _cap(id_, read, write))

    def scan(items: list[Any]) -> None:
        for item in items:
            if not isinstance(item, dict):
                continue
            t = item.get("type")
            name = str(item.get("name") or "")
            access = item.get("access")
            if isinstance(access, list):
                access_val = None
            else:
                access_val = int(access) if isinstance(access, (int, float)) else None
            can_read, can_write = _access_rw(access_val, default_write=t in ("light", "switch", "lock", "cover"))

            if name in _SKIP_SWITCH_NAMES:
                continue
            if t == "light":
                add("switch", can_read, can_write)
                add("dimmer", can_read, can_write)
            elif t == "climate":
                pass
            elif t == "switch" or name == "state":
                add("switch", can_read, can_write)
            elif t == "lock":
                add("lock", can_read, can_write)
            elif t == "cover":
                add("cover", can_read, can_write)
            elif t == "fan":
                add("fan", can_read, can_write)
            elif t in ("binary", "binary_sensor") or name in (
                "contact",
                "occupancy",
                "motion",
                "water_leak",
                "smoke",
                "gas",
            ):
                if name in _SKIP_BINARY_NAMES:
                    continue
                if name in ("contact", "contact_sensor") or "contact" in name:
                    add("contact", True, False)
                elif name in ("occupancy", "presence"):
                    add("occupancy", True, False)
                elif "motion" in name:
                    add("motion", True, False)
                else:
                    add("contact", True, False)
            elif t == "numeric" or name in (
                "temperature",
                "humidity",
                "co2",
                "voc",
                "pm25",
                "pm10",
                "battery",
            ):
                if name == "temperature" or "temp" in name:
                    add("temperature", True, False)
                elif name == "humidity":
                    add("humidity", True, False)
                elif name == "co2":
                    add("co2", True, False)
                elif name in ("voc", "tvoc"):
                    add("tvoc", True, False)
                elif name.startswith("pm"):
                    add("pm", True, False)
                elif name == "battery":
                    add("battery", True, False)
            elif name == "action":
                add("button", True, False)

            if name in ("color_xy", "color_hs", "color_temp", "hue", "saturation"):
                add("color", True, True)

            feats = item.get("features")
            if isinstance(feats, list):
                scan(feats)

    scan(exposes if isinstance(exposes, list) else [])
    return sorted(caps.values(), key=lambda c: c["id"])


def _infer_kind(caps: list[dict[str, Any]]) -> str:
    ids = {c["id"] for c in caps}
    has_env = bool(
        ids & {"temperature", "humidity", "co2", "contact", "motion", "occupancy", "tvoc", "pm", "battery"}
    )
    if "button" in ids and has_env:
        return "sensor"
    if "lock" in ids:
        return "lock"
    if "color" in ids or "dimmer" in ids:
        return "light"
    if "switch" in ids or "relay" in ids:
        return "switch"
    if "fan" in ids:
        return "fan"
    if has_env:
        return "sensor"
    if "button" in ids:
        return "switch"
    return "other"


def _controllable(caps: list[dict[str, Any]]) -> bool:
    return any(c.get("write") and c["id"] in CONTROL_IDS for c in caps)


def _is_light(device: dict[str, Any]) -> bool:
    if _is_w100_climate_sensor(device):
        return False
    caps = _discover_capabilities(device)
    ids = {c["id"] for c in caps}
    if "button" in ids and ids & {"temperature", "humidity"}:
        return False
    return bool(ids & {"switch", "dimmer", "relay", "color"})


def _is_remote_or_switch(device: dict[str, Any]) -> bool:
    if device.get("type") == "Coordinator" or _is_light(device):
        return False
    caps = _discover_capabilities(device)
    ids = {c["id"] for c in caps}
    if ids & {"temperature", "humidity", "co2", "contact", "motion", "occupancy", "tvoc", "pm"}:
        return False
    return "button" in ids or "switch" in ids


def _device_topic_name(prefix: str, topic: str) -> str | None:
    head = f"{prefix}/"
    if not topic.startswith(head) or topic.startswith(f"{prefix}/bridge"):
        return None
    name = topic[len(head) :]
    return name or None


def _device_meta(dev: dict[str, Any]) -> dict[str, str | None]:
    definition = dev.get("definition") if isinstance(dev.get("definition"), dict) else {}
    model = dev.get("model_id") or definition.get("model")
    manufacturer = definition.get("vendor") or dev.get("manufacturer")
    description = definition.get("description") or ""
    out: dict[str, str | None] = {}
    if model:
        out["model"] = str(model)
    if manufacturer:
        out["manufacturer"] = str(manufacturer)
    if description:
        out["description"] = str(description)
    return out


def fetch_zigbee_home(
    broker_url: str, prefix: str, timeout_sec: float = 5.0
) -> dict[str, dict[str, Any]]:
    """Palauttaa zigbee:<nimi> → {protocol, kind, name, capabilities, ...}."""
    raw = fetch_lights(broker_url, prefix, timeout_sec)
    out: dict[str, dict[str, Any]] = {}
    device_caps: dict[str, list[dict[str, Any]]] = {}
    device_meta: dict[str, dict[str, str | None]] = {}

    host, port = _parse_mqtt_url(broker_url)

    def on_devices(_client, _userdata, msg):
        if msg.topic != f"{prefix}/bridge/devices":
            return
        try:
            devices = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            return
        if not isinstance(devices, list):
            return
        for dev in devices:
            if not isinstance(dev, dict):
                continue
            name = dev.get("friendly_name")
            if not name:
                continue
            device_caps[str(name)] = _discover_capabilities(dev)
            device_meta[str(name)] = _device_meta(dev)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_devices
    try:
        client.connect(host, port, keepalive=30)
        client.subscribe(f"{prefix}/bridge/devices")
        client.loop_start()
        time.sleep(0.8)
        client.loop_stop()
        client.disconnect()
    except Exception:
        pass

    for name, state in raw.items():
        key = f"zigbee:{name}"
        caps = device_caps.get(name) or [{"id": "switch", "read": True, "write": True}, {"id": "dimmer", "read": True, "write": True}]
        out[key] = {
            "protocol": "zigbee",
            "kind": _infer_kind(caps),
            "name": state.get("name") or name,
            "on": state.get("on", False),
            "brightness": state.get("brightness"),
            "controllable": _controllable(caps),
            "capabilities": caps,
            **(device_meta.get(name) or {}),
        }

    switches: dict[str, dict[str, Any]] = {}

    def on_devices_switches(_client, _userdata, msg):
        if msg.topic != f"{prefix}/bridge/devices":
            return
        try:
            devices = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            return
        if not isinstance(devices, list):
            return
        for dev in devices:
            if not isinstance(dev, dict):
                continue
            name = dev.get("friendly_name")
            if not name or _is_light(dev) or not _is_remote_or_switch(dev):
                continue
            caps = _discover_capabilities(dev)
            device_meta[str(name)] = _device_meta(dev)
            key = f"zigbee:{name}"
            switches[key] = {
                "protocol": "zigbee",
                "kind": _infer_kind(caps) if caps else "switch",
                "name": str(name),
                "on": False,
                "brightness": None,
                "controllable": False,
                "capabilities": caps or [{"id": "button", "read": True, "write": False}],
                **(device_meta.get(str(name)) or {}),
            }

    client2 = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client2.on_message = on_devices_switches
    try:
        client2.connect(host, port, keepalive=30)
        client2.subscribe(f"{prefix}/bridge/devices")
        client2.loop_start()
        time.sleep(0.8)
        client2.loop_stop()
        client2.disconnect()
    except Exception:
        pass

    out.update(switches)

    # Anturilaitteet joita ei ole valoja/kytkimiä
    sensor_devices: dict[str, dict[str, Any]] = {}

    def on_sensor_devices(_client, _userdata, msg):
        if msg.topic != f"{prefix}/bridge/devices":
            return
        try:
            devices = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            return
        if not isinstance(devices, list):
            return
        for dev in devices:
            if not isinstance(dev, dict):
                continue
            name = dev.get("friendly_name")
            if not name or _is_light(dev) or _is_remote_or_switch(dev):
                continue
            caps = _discover_capabilities(dev)
            if not caps or _infer_kind(caps) != "sensor":
                continue
            key = f"zigbee:{name}"
            sensor_devices[key] = {
                "protocol": "zigbee",
                "kind": "sensor",
                "name": str(name),
                "controllable": False,
                "capabilities": caps,
                **(device_meta.get(str(name)) or _device_meta(dev)),
            }

    client3 = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client3.on_message = on_sensor_devices
    try:
        client3.connect(host, port, keepalive=30)
        client3.subscribe(f"{prefix}/bridge/devices")
        client3.loop_start()
        time.sleep(0.8)
        client3.loop_stop()
        client3.disconnect()
    except Exception:
        pass

    out.update(sensor_devices)

    sensor_names = {
        key[len("zigbee:") :]
        for key, meta in out.items()
        if key.startswith("zigbee:") and _device_needs_telemetry(meta)
    }
    if sensor_names:
        try:
            readings = _fetch_sensor_states(broker_url, prefix, sensor_names, timeout_sec=timeout_sec)
            for name, state in readings.items():
                key = f"zigbee:{name}"
                if key in out and state:
                    _apply_sensor_payload(out[key], state)
        except Exception as exc:
            log.debug("Zigbee sensor state read failed: %s", exc)

    return out


def _device_needs_telemetry(meta: dict[str, Any]) -> bool:
    caps = meta.get("capabilities") or []
    if not isinstance(caps, list):
        return False
    ids = {c.get("id") for c in caps if isinstance(c, dict)}
    return bool(
        ids
        & {
            "temperature",
            "humidity",
            "battery",
            "contact",
            "motion",
            "occupancy",
        }
    )


def _apply_sensor_payload(device: dict[str, Any], state: dict[str, Any]) -> None:
    temp = state.get("temperature")
    if temp is None:
        temp = state.get("local_temperature")
    if isinstance(temp, (int, float)):
        device["temperature_c"] = float(temp)
    hum = state.get("humidity")
    if isinstance(hum, (int, float)):
        device["humidity_pct"] = float(hum)
    batt = state.get("battery")
    if isinstance(batt, (int, float)):
        device["battery_pct"] = float(batt)

    for key in ("water_leak", "smoke", "gas", "occupancy", "presence"):
        if key not in state:
            continue
        val = state[key]
        if isinstance(val, bool):
            device["on"] = val
            if key == "water_leak":
                device["sensor_state"] = "water_leak"
            elif key == "smoke":
                device["sensor_state"] = "smoke"
            elif key in ("occupancy", "presence"):
                device["sensor_state"] = "motion"
            break

    contact = state.get("contact")
    if contact is None:
        contact = state.get("contact_state")
    if isinstance(contact, bool):
        device["on"] = contact
        device["sensor_state"] = "contact"


def _fetch_sensor_states(
    broker_url: str,
    prefix: str,
    sensor_names: set[str],
    timeout_sec: float = 5.0,
) -> dict[str, dict[str, Any]]:
    """Lukee lämpö-/kosteusarvot Zigbee2MQTT-tilaviestistä."""
    if not sensor_names:
        return {}

    readings: dict[str, dict[str, Any]] = {name: {} for name in sensor_names}
    devices_ready = threading.Event()
    host, port = _parse_mqtt_url(broker_url)

    def on_message(_client, _userdata, msg):
        topic = msg.topic
        if topic == f"{prefix}/bridge/devices":
            devices_ready.set()
            return
        name = _device_topic_name(prefix, topic)
        if not name or name not in sensor_names:
            return
        try:
            state = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            return
        if not isinstance(state, dict):
            return
        bucket = readings.setdefault(name, {})
        for key in (
            "temperature",
            "local_temperature",
            "humidity",
            "battery",
            "contact",
            "contact_state",
            "water_leak",
            "smoke",
            "occupancy",
            "presence",
            "gas",
        ):
            if key in state:
                bucket[key] = state[key]

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    try:
        client.connect(host, port, keepalive=30)
    except Exception as exc:
        log.warning("MQTT connect failed (sensors): %s", exc)
        return {}

    client.subscribe(f"{prefix}/bridge/devices")
    client.subscribe(f"{prefix}/#")
    client.loop_start()
    devices_ready.wait(timeout=timeout_sec)
    time.sleep(0.5)
    client.loop_stop()
    client.disconnect()
    return readings


def fetch_lights(broker_url: str, prefix: str, timeout_sec: float = 5.0) -> dict[str, dict]:
    lights: dict[str, dict] = {}
    devices_ready = threading.Event()
    host, port = _parse_mqtt_url(broker_url)

    def on_message(_client, _userdata, msg):
        topic = msg.topic
        if topic == f"{prefix}/bridge/devices":
            try:
                devices = json.loads(msg.payload.decode())
            except json.JSONDecodeError:
                return
            if not isinstance(devices, list):
                return
            for dev in devices:
                if not isinstance(dev, dict):
                    continue
                name = dev.get("friendly_name")
                if name and _is_light(dev):
                    lights[str(name)] = {
                        "on": False,
                        "brightness": None,
                        "name": str(name),
                    }
            devices_ready.set()
            return

        name = _device_topic_name(prefix, topic)
        if not name or name not in lights:
            return
        try:
            state = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            return
        if "state" in state:
            lights[name]["on"] = state["state"] == "ON"
        if "brightness" in state:
            lights[name]["brightness"] = state["brightness"]

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    try:
        client.connect(host, port, keepalive=30)
    except Exception as exc:
        log.warning("MQTT connect failed: %s", exc)
        return {}

    client.subscribe(f"{prefix}/bridge/devices")
    client.subscribe(f"{prefix}/#")
    client.loop_start()
    devices_ready.wait(timeout=timeout_sec)
    time.sleep(0.5)
    client.loop_stop()
    client.disconnect()
    return lights


def set_light(broker_url: str, prefix: str, light_id: str, on: bool) -> bool:
    payload = json.dumps({"state": "ON" if on else "OFF"})
    return publish_light(broker_url, prefix, light_id, payload)


def publish_light(
    broker_url: str, prefix: str, light_id: str, payload: str | dict[str, Any]
) -> bool:
    body = json.dumps(payload) if isinstance(payload, dict) else payload
    host, port = _parse_mqtt_url(broker_url)
    topic_key = f"{prefix}/{light_id}"
    now = time.monotonic()
    with _publish_lock:
        wait = _MIN_PUBLISH_INTERVAL_SEC - (now - _last_publish.get(topic_key, 0.0))
        if wait > 0:
            time.sleep(wait)
        _last_publish[topic_key] = time.monotonic()
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    try:
        client.connect(host, port, keepalive=30)
        client.loop_start()
        client.publish(f"{prefix}/{light_id}/set", body)
        time.sleep(0.3)
        client.loop_stop()
        client.disconnect()
        return True
    except Exception as exc:
        log.warning("MQTT set light failed: %s", exc)
        return False


def set_light_brightness(
    broker_url: str, prefix: str, light_id: str, brightness: int, on: bool = True
) -> bool:
    brightness = max(0, min(254, int(brightness)))
    payload: dict[str, Any] = {
        "state": "ON" if on and brightness > 0 else "OFF",
        "brightness": brightness,
    }
    return publish_light(broker_url, prefix, light_id, payload)


def set_light_color_hue(
    broker_url: str, prefix: str, light_id: str, hue: int, saturation: int = 254
) -> bool:
    payload: dict[str, Any] = {
        "state": "ON",
        "color_mode": "hue",
        "color": {"hue": max(0, min(254, int(hue))), "saturation": max(0, min(254, int(saturation)))},
    }
    return publish_light(broker_url, prefix, light_id, payload)
