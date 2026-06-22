"""Z-Wave JS UI → MQTT (prefix zwave) — kaikki command class -ominaisuudet."""

from __future__ import annotations

import json
import logging
import re
import threading
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import paho.mqtt.client as mqtt

log = logging.getLogger(__name__)

NODE_ID_RE = re.compile(r"^nodeID_(\d+)$")
CURRENT_VALUE_RE = re.compile(
    r"^zwave/([^/]+)/([^/]+)/(\d+)/(\d+)/currentValue$"
)
CURRENT_VALUE_NODE_RE = re.compile(
    r"^zwave/(nodeID_\d+)/(\d+)/(\d+)/currentValue$"
)
STATUS_RE = re.compile(r"^zwave/([^/]+)/([^/]+)/status$")

CONTROL_IDS = {"switch", "dimmer", "lock", "relay", "fan", "cover"}

# CC → capability mapping (property name overrides in _cc_caps)
CC_DEFAULT: dict[int, list[tuple[str, bool, bool]]] = {
    37: [("switch", True, True)],
    38: [("dimmer", True, True), ("switch", True, True)],
    98: [("lock", True, True)],
    49: [("temperature", True, False)],
    48: [("contact", True, False)],
    50: [("energy", True, False), ("meter", True, False)],
    62: [("fan", True, True)],
    64: [("temperature", True, False)],
    113: [("motion", True, False)],
}


def _parse_mqtt_url(url: str) -> tuple[str, int]:
    parsed = urlparse(url)
    return parsed.hostname or "127.0.0.1", parsed.port or 1883


def _cap(id_: str, read: bool = True, write: bool = False) -> dict[str, Any]:
    return {"id": id_, "read": read, "write": write}


def _merge_cap(caps: dict[str, dict[str, Any]], cap: dict[str, Any]) -> None:
    id_ = cap["id"]
    if id_ in caps:
        caps[id_]["read"] = caps[id_]["read"] or cap["read"]
        caps[id_]["write"] = caps[id_]["write"] or cap["write"]
    else:
        caps[id_] = dict(cap)


def _property_caps(cc: int, prop: str | None) -> list[tuple[str, bool, bool]]:
    p = (prop or "").casefold()
    if cc == 49:
        if "humidity" in p:
            return [("humidity", True, False)]
        if "co2" in p or "carbon dioxide" in p:
            return [("co2", True, False)]
        if "luminance" in p or "illuminance" in p:
            return [("meter", True, False)]
        if "temperature" in p or "air" in p:
            return [("temperature", True, False)]
        return [("temperature", True, False)]
    if cc == 48:
        if "motion" in p or "tamper" in p:
            return [("motion", True, False)]
        if "door" in p or "window" in p or "contact" in p:
            return [("contact", True, False)]
        return [("contact", True, False)]
    if cc == 113:
        return [("motion", True, False)]
    return CC_DEFAULT.get(cc, [])


def _load_node_names(path: str) -> dict[int, dict[str, str]]:
    p = Path(path)
    if not p.is_file():
        return {}
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    home = raw.get(list(raw.keys())[0], raw) if raw else {}
    if not isinstance(home, dict):
        return {}
    out: dict[int, dict[str, str]] = {}
    for key, meta in home.items():
        if not str(key).isdigit() or not isinstance(meta, dict):
            continue
        node_id = int(key)
        name = str(meta.get("name") or f"Node {node_id}").strip()
        loc = str(meta.get("loc") or "").strip()
        out[node_id] = {"name": name, "loc": loc}
    return out


def _slug(text: str) -> str:
    return text.strip().replace(" ", "_")


def _build_topic_paths(meta: dict[int, dict[str, str]]) -> dict[str, int]:
    paths: dict[str, int] = {}
    for node_id, info in meta.items():
        if info.get("loc"):
            paths[f"{info['loc']}/{_slug(info['name'])}"] = node_id
        paths[f"nodeID_{node_id}"] = node_id
    return paths


def _classify(name: str, caps: list[dict[str, Any]]) -> str:
    ids = {c["id"] for c in caps}
    if "lock" in ids:
        return "lock"
    if ids & {"switch", "dimmer", "relay", "color"}:
        return "light"
    if "fan" in ids:
        return "fan"
    if ids & {"temperature", "humidity", "co2", "contact", "motion", "occupancy", "energy", "meter"}:
        return "sensor"
    n = name.casefold()
    if "lukko" in n:
        return "lock"
    if "kytkin" in n:
        return "switch"
    if "tuuletin" in n or "liesi" in n:
        return "fan"
    if "anturi" in n or "ovikello" in n:
        return "sensor"
    if "valo" in n:
        return "light"
    return "other"


def _infer_caps_from_name(name: str) -> list[dict[str, Any]]:
    """Kun MQTT-skannaus ei saa currentValue-viestejä (nukkuvat anturit jne.)."""
    kind = _classify(name, [])
    if kind == "lock":
        return [_cap("lock", True, True)]
    if kind == "light":
        return [_cap("switch", True, True), _cap("dimmer", True, True)]
    if kind in {"switch", "fan"}:
        return [_cap("switch", True, True)]
    if kind == "sensor":
        n = name.casefold()
        if "ovikello" in n or "motion" in n or "liike" in n:
            return [_cap("motion", True, False)]
        if "ovi" in n or "contact" in n:
            return [_cap("contact", True, False)]
        if "co2" in n:
            return [_cap("co2", True, False)]
        if "kosteus" in n:
            return [_cap("humidity", True, False)]
        return [_cap("temperature", True, False)]
    return [_cap("button", True, False)]


def _controllable(caps: list[dict[str, Any]]) -> bool:
    return any(c.get("write") and c["id"] in CONTROL_IDS for c in caps)


def fetch_zwave_devices(
    broker_url: str,
    prefix: str,
    nodes_json: str,
    timeout_sec: float = 4.0,
) -> dict[str, dict[str, Any]]:
    meta = _load_node_names(nodes_json)
    topic_paths = _build_topic_paths(meta)
    devices: dict[str, dict[str, Any]] = {}
    topic_map: dict[int, str] = {}
    node_caps: dict[int, dict[str, dict[str, Any]]] = {}
    host, port = _parse_mqtt_url(broker_url)

    def ensure(node_id: int) -> dict[str, Any]:
        key = f"zwave:{node_id}"
        if key not in devices:
            info = meta.get(node_id, {"name": f"Node {node_id}", "loc": ""})
            devices[key] = {
                "protocol": "zwave",
                "kind": "other",
                "name": info["name"],
                "room": info["loc"] or None,
                "on": False,
                "brightness": None,
                "controllable": False,
                "node_id": node_id,
                "capabilities": [],
            }
            node_caps[node_id] = {}
        return devices[key]

    def add_cc_cap(node_id: int, cc: int, prop: str | None = None) -> None:
        caps_map = node_caps.setdefault(node_id, {})
        entries = _property_caps(cc, prop) or CC_DEFAULT.get(cc, [])
        for id_, read, write in entries:
            _merge_cap(caps_map, _cap(id_, read, write))

    def finalize(node_id: int) -> None:
        dev = ensure(node_id)
        caps_list = sorted(node_caps.get(node_id, {}).values(), key=lambda c: c["id"])
        dev["capabilities"] = caps_list
        dev["kind"] = _classify(dev["name"], caps_list)
        dev["controllable"] = _controllable(caps_list)

    def on_message(_client, _userdata, msg):
        topic = msg.topic
        if not topic.startswith(f"{prefix}/"):
            return
        try:
            payload = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            payload = {}

        if not isinstance(payload, dict):
            return

        m = STATUS_RE.match(topic)
        if m:
            node_id = payload.get("nodeId")
            if isinstance(node_id, int):
                topic_map[node_id] = f"{prefix}/{m.group(1)}/{m.group(2)}"
            return

        prop = payload.get("property")
        if isinstance(prop, str):
            prop_name = prop
        else:
            prop_name = None

        m = CURRENT_VALUE_RE.match(topic)
        if m:
            loc, slug, cc, ep = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
            node_id = topic_paths.get(f"{loc}/{slug}")
            if node_id is None:
                return
            topic_map[node_id] = f"{prefix}/{loc}/{slug}"
            add_cc_cap(node_id, cc, prop_name)
            dev = ensure(node_id)
            base = f"{prefix}/{loc}/{slug}"

            if cc == 37 and ep in (0, 1):
                value = payload.get("value")
                if isinstance(value, bool):
                    dev["on"] = value
                elif isinstance(value, (int, float)):
                    dev["on"] = value > 0
                dev["mqtt_set_topic"] = f"{base}/{cc}/{ep}/targetValue"
            elif cc == 38 and ep in (0, 1):
                value = payload.get("value")
                if isinstance(value, bool):
                    dev["on"] = value
                elif isinstance(value, (int, float)):
                    dev["on"] = value > 0
                    dev["brightness"] = int(value)
                dev["mqtt_set_topic"] = f"{base}/{cc}/{ep}/targetValue"
            elif cc == 98 and ep in (0, 1):
                value = payload.get("value")
                if isinstance(value, bool):
                    dev["locked"] = value
                    dev["on"] = value
                elif isinstance(value, (int, float)):
                    locked = value in (255, 1) or value > 0
                    dev["locked"] = locked
                    dev["on"] = locked
                dev["lock_set_topic"] = f"{base}/{cc}/{ep}/targetValue"
            elif cc == 49:
                value = payload.get("value")
                if isinstance(value, (int, float)):
                    p = (prop_name or "").casefold()
                    if "humidity" in p:
                        dev["humidity_pct"] = float(value)
                    elif "co2" in p or "carbon" in p:
                        dev["co2_ppm"] = float(value)
                    elif "temperature" in p or "air" in p or not p:
                        dev["temperature_c"] = float(value)
            elif cc == 50:
                value = payload.get("value")
                if isinstance(value, (int, float)):
                    dev["power_w"] = float(value)
            elif cc == 48:
                value = payload.get("value")
                if isinstance(value, bool):
                    dev["on"] = value
            finalize(node_id)
            return

        m = CURRENT_VALUE_NODE_RE.match(topic)
        if m:
            node_slug, cc, ep = m.group(1), int(m.group(2)), int(m.group(3))
            nid_m = NODE_ID_RE.match(node_slug)
            if not nid_m:
                return
            node_id = int(nid_m.group(1))
            add_cc_cap(node_id, cc, prop_name)
            dev = ensure(node_id)
            base = topic_map.get(node_id) or f"{prefix}/{node_slug}"

            if cc in (37, 38) and ep in (0, 1):
                value = payload.get("value")
                if isinstance(value, bool):
                    dev["on"] = value
                elif isinstance(value, (int, float)):
                    dev["on"] = value > 0
                    if cc == 38:
                        dev["brightness"] = int(value)
                dev["mqtt_set_topic"] = f"{base}/{cc}/{ep}/targetValue"
            elif cc == 98 and ep in (0, 1):
                value = payload.get("value")
                if isinstance(value, bool):
                    dev["locked"] = value
                    dev["on"] = value
                elif isinstance(value, (int, float)):
                    locked = value in (255, 1) or value > 0
                    dev["locked"] = locked
                    dev["on"] = locked
                dev["lock_set_topic"] = f"{base}/{cc}/{ep}/targetValue"
            elif cc == 49:
                value = payload.get("value")
                if isinstance(value, (int, float)):
                    p = (prop_name or "").casefold()
                    if "humidity" in p:
                        dev["humidity_pct"] = float(value)
                    elif "co2" in p:
                        dev["co2_ppm"] = float(value)
                    else:
                        dev["temperature_c"] = float(value)
            finalize(node_id)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    try:
        client.connect(host, port, keepalive=30)
    except Exception as exc:
        log.warning("Z-Wave MQTT connect failed: %s", exc)
        return {}

    client.subscribe(f"{prefix}/#")
    client.loop_start()
    time.sleep(timeout_sec)
    client.loop_stop()
    client.disconnect()

    for node_id, info in meta.items():
        if info["name"].startswith("Node "):
            continue
        dev = ensure(node_id)
        if not dev.get("capabilities"):
            dev["capabilities"] = _infer_caps_from_name(info["name"])
        finalize(node_id)

    return {
        k: v
        for k, v in devices.items()
        if not str(v.get("name", "")).startswith("Node ")
    }


def set_zwave_device(
    broker_url: str,
    mqtt_set_topic: str,
    on: bool,
    brightness: int | None = None,
) -> bool:
    host, port = _parse_mqtt_url(broker_url)
    value: bool | int = brightness if brightness is not None else on
    payload = json.dumps({"value": value})
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    try:
        client.connect(host, port, keepalive=30)
        client.loop_start()
        client.publish(f"{mqtt_set_topic}/set", payload)
        time.sleep(0.3)
        client.loop_stop()
        client.disconnect()
        return True
    except Exception as exc:
        log.warning("Z-Wave set failed: %s", exc)
        return False


def set_zwave_lock(broker_url: str, lock_set_topic: str, locked: bool) -> bool:
    host, port = _parse_mqtt_url(broker_url)
    payload = json.dumps({"value": locked})
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    try:
        client.connect(host, port, keepalive=30)
        client.loop_start()
        client.publish(f"{lock_set_topic}/set", payload)
        time.sleep(0.3)
        client.loop_stop()
        client.disconnect()
        return True
    except Exception as exc:
        log.warning("Z-Wave lock failed: %s", exc)
        return False
