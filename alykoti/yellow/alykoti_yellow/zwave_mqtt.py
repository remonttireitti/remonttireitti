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
ZWAVE_DEVICE_ID_RE = re.compile(r"^zwave:(\d+)(?::e(\d+))?$")
CURRENT_VALUE_RE = re.compile(
    r"^zwave/([^/]+)/([^/]+)/(\d+)/(\d+)/currentValue$"
)
CURRENT_VALUE_NODE_RE = re.compile(
    r"^zwave/(nodeID_\d+)/(\d+)/(\d+)/currentValue$"
)
STATUS_RE = re.compile(r"^zwave/([^/]+)/([^/]+)/status$")

CONTROL_IDS = {"switch", "dimmer", "lock", "relay", "fan", "cover"}

# CC 38 reports 0/1/99/255 on many binary switches — not true dimmer range.
CC38_BINARY_VALUES = frozenset({0, 1, 99, 255})

# CC → capability mapping (property name overrides in _property_caps)
CC_DEFAULT: dict[int, list[tuple[str, bool, bool]]] = {
    37: [("switch", True, True)],
    38: [("dimmer", True, True)],
    98: [("lock", True, True)],
    49: [("temperature", True, False)],
    48: [("contact", True, False)],
    50: [("energy", True, False), ("meter", True, False)],
    62: [("fan", True, True)],
    64: [("temperature", True, False)],
    113: [("motion", True, False)],
}


def parse_zwave_device_id(device_id: str) -> tuple[int, int | None]:
    """Parse zwave:52 or zwave:52:e1 → (node_id, endpoint|None)."""
    m = ZWAVE_DEVICE_ID_RE.match(device_id.strip())
    if not m:
        raise ValueError(f"Invalid Z-Wave device id: {device_id!r}")
    node_id = int(m.group(1))
    ep_raw = m.group(2)
    return node_id, int(ep_raw) if ep_raw is not None else None


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


def _cc48_sensor_state(prop: str | None) -> str:
    p = (prop or "").casefold()
    if any(x in p for x in ("water", "leak", "flood", "moisture")):
        return "water_leak"
    if any(x in p for x in ("smoke", "fire", "heat")):
        return "smoke"
    if "carbon" in p or p == "co":
        return "co"
    if "motion" in p:
        return "motion"
    if "tamper" in p:
        return "tamper"
    if any(x in p for x in ("door", "window", "contact")):
        return "contact"
    return "contact"


def _cc113_sensor_state(prop: str | None, value: Any) -> str:
    p = (prop or "").casefold()
    if "home security" in p or "intrusion" in p:
        return "motion"
    if "access control" in p:
        return "contact"
    if "water" in p:
        return "water_leak"
    if "smoke" in p or "fire" in p:
        return "smoke"
    if "co " in p or p.startswith("co") or "carbon" in p:
        return "co"
    if isinstance(value, str):
        v = value.casefold()
        if "motion" in v or "occupancy" in v:
            return "motion"
        if "water" in v or "leak" in v:
            return "water_leak"
        if "smoke" in v or "fire" in v:
            return "smoke"
    return "motion"


def _property_caps(cc: int, prop: str | None) -> list[tuple[str, bool, bool]]:
    p = (prop or "").casefold()
    if cc == 49:
        if "humidity" in p:
            return [("humidity", True, False)]
        if "co2" in p or "carbon dioxide" in p:
            return [("co2", True, False)]
        if "luminance" in p or "illuminance" in p:
            return [("illuminance", True, False)]
        if "temperature" in p or "air" in p:
            return [("temperature", True, False)]
        return [("temperature", True, False)]
    if cc == 48:
        state = _cc48_sensor_state(prop)
        if state in ("water_leak", "smoke", "co"):
            return [("contact", True, False)]
        if state == "motion":
            return [("motion", True, False)]
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
    if ids & {
        "temperature",
        "humidity",
        "co2",
        "contact",
        "motion",
        "occupancy",
        "energy",
        "meter",
        "illuminance",
    }:
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
        n = name.casefold()
        if "himmenn" in n or "dimmer" in n:
            return [_cap("switch", True, True), _cap("dimmer", True, True)]
        return [_cap("switch", True, True)]
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
        if "lux" in n or "valo" in n:
            return [_cap("illuminance", True, False)]
        return [_cap("temperature", True, False)]
    return [_cap("button", True, False)]


def _controllable(caps: list[dict[str, Any]]) -> bool:
    return any(c.get("write") and c["id"] in CONTROL_IDS for c in caps)


def _endpoint_label(caps: list[dict[str, Any]], endpoint: int) -> str:
    ids = {c["id"] for c in caps}
    if ids & {"switch", "dimmer", "relay"}:
        return f"Kytkin {endpoint}"
    if "temperature" in ids:
        return f"Lämpö {endpoint}"
    if "humidity" in ids:
        return f"Kosteus {endpoint}"
    if "illuminance" in ids:
        return f"Valoisuus {endpoint}"
    if "motion" in ids:
        return f"Liike {endpoint}"
    if "contact" in ids:
        return f"Anturi {endpoint}"
    if "lock" in ids:
        return f"Lukko {endpoint}"
    return f"EP {endpoint}"


def _device_id_for(node_id: int, endpoint: int, multi: bool) -> str:
    if multi:
        return f"zwave:{node_id}:e{endpoint}"
    return f"zwave:{node_id}"


def _cc38_values_binary(values: set[int]) -> bool:
    return not values or values.issubset(CC38_BINARY_VALUES)


def _resolve_control_cc(dev: dict[str, Any]) -> int | None:
    ccs: set[int] = dev.get("_ccs_seen") or set()
    if 37 in ccs:
        return 37
    if 38 in ccs:
        return 38
    return None


def _trim_switch_caps(dev: dict[str, Any], caps_map: dict[str, dict[str, Any]]) -> None:
    ccs: set[int] = dev.get("_ccs_seen") or set()
    cc38_values: set[int] = dev.get("_cc38_values") or set()
    cc38_binary = _cc38_values_binary(cc38_values)

    if 37 in ccs:
        caps_map.pop("dimmer", None)
    elif 38 in ccs and cc38_values and cc38_binary:
        caps_map.pop("dimmer", None)
        _merge_cap(caps_map, _cap("switch", True, True))


def _apply_cc_value(
    dev: dict[str, Any],
    cc: int,
    ep: int,
    prop_name: str | None,
    payload: dict[str, Any],
    base: str,
) -> None:
    value = payload.get("value")
    if cc in (37, 38):
        dev.setdefault("_ccs_seen", set()).add(cc)
        topics: dict[int, str] = dev.setdefault("_mqtt_topics", {})
        topics[cc] = f"{base}/{cc}/{ep}/targetValue"
        if isinstance(value, bool):
            dev["on"] = value
        elif isinstance(value, (int, float)):
            dev["on"] = value > 0
            if cc == 38:
                dev.setdefault("_cc38_values", set()).add(int(value))
                if not _cc38_values_binary(dev["_cc38_values"]):
                    dev["brightness"] = int(value)
    elif cc == 98:
        if isinstance(value, bool):
            dev["locked"] = value
            dev["on"] = value
        elif isinstance(value, (int, float)):
            locked = value in (255, 1) or value > 0
            dev["locked"] = locked
            dev["on"] = locked
        dev["lock_set_topic"] = f"{base}/{cc}/{ep}/targetValue"
    elif cc == 49:
        if isinstance(value, (int, float)):
            p = (prop_name or "").casefold()
            if "humidity" in p:
                dev["humidity_pct"] = float(value)
            elif "co2" in p or "carbon" in p:
                dev["co2_ppm"] = float(value)
            elif "luminance" in p or "illuminance" in p:
                dev["illuminance_lux"] = float(value)
            elif "temperature" in p or "air" in p or not p:
                dev["temperature_c"] = float(value)
    elif cc == 50:
        if isinstance(value, (int, float)):
            dev["power_w"] = float(value)
    elif cc == 48:
        if isinstance(value, bool):
            dev["on"] = value
            dev["sensor_state"] = _cc48_sensor_state(prop_name)
        elif isinstance(value, (int, float)):
            dev["on"] = value > 0
            dev["sensor_state"] = _cc48_sensor_state(prop_name)
    elif cc == 113:
        dev["sensor_state"] = _cc113_sensor_state(prop_name, value)
        on = _zwave_value_to_on(value)
        if on is not None:
            dev["on"] = on


def _zwave_value_to_on(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    if isinstance(value, str):
        v = value.casefold()
        if v in ("true", "on", "open", "motion", "active", "detected"):
            return True
        if v in ("false", "off", "closed", "idle", "inactive", "no_motion"):
            return False
    return None


def _request_node_refresh(
    client: mqtt.Client,
    prefix: str,
    gateway: str,
    node_id: int,
) -> None:
    topic = f"{prefix}/_CLIENTS/ZWAVE_GATEWAY-{gateway}/api/getState/set"
    try:
        client.publish(topic, json.dumps({"nodeId": node_id}))
    except Exception as exc:
        log.debug("Z-Wave getState refresh failed node %s: %s", node_id, exc)


def fetch_zwave_devices(
    broker_url: str,
    prefix: str,
    nodes_json: str,
    timeout_sec: float = 8.0,
    gateway: str = "Mosquitto",
) -> dict[str, dict[str, Any]]:
    meta = _load_node_names(nodes_json)
    topic_paths = _build_topic_paths(meta)
    devices: dict[str, dict[str, Any]] = {}
    topic_map: dict[int, str] = {}
    node_caps: dict[tuple[int, int], dict[str, dict[str, Any]]] = {}
    endpoint_data: dict[tuple[int, int], dict[str, Any]] = {}
    node_endpoints: dict[int, set[int]] = {}
    nodes_with_data: set[int] = set()
    host, port = _parse_mqtt_url(broker_url)

    def ensure_endpoint(node_id: int, endpoint: int) -> dict[str, Any]:
        key = (node_id, endpoint)
        if key not in endpoint_data:
            info = meta.get(node_id, {"name": f"Node {node_id}", "loc": ""})
            endpoint_data[key] = {
                "protocol": "zwave",
                "kind": "other",
                "name": info["name"],
                "room": info["loc"] or None,
                "on": False,
                "brightness": None,
                "controllable": False,
                "node_id": node_id,
                "endpoint": endpoint,
                "capabilities": [],
            }
            node_caps[key] = {}
            node_endpoints.setdefault(node_id, set()).add(endpoint)
        return endpoint_data[key]

    def add_cc_cap(node_id: int, endpoint: int, cc: int, prop: str | None = None) -> None:
        key = (node_id, endpoint)
        caps_map = node_caps.setdefault(key, {})
        entries = _property_caps(cc, prop) or CC_DEFAULT.get(cc, [])
        for id_, read, write in entries:
            _merge_cap(caps_map, _cap(id_, read, write))

    def finalize_endpoint(node_id: int, endpoint: int) -> None:
        dev = ensure_endpoint(node_id, endpoint)
        key = (node_id, endpoint)
        caps_map = node_caps.get(key, {})
        _trim_switch_caps(dev, caps_map)
        control_cc = _resolve_control_cc(dev)
        if control_cc is not None:
            topic = (dev.get("_mqtt_topics") or {}).get(control_cc)
            if topic:
                dev["mqtt_set_topic"] = topic
            dev["control_cc"] = control_cc
        caps_list = sorted(caps_map.values(), key=lambda c: c["id"])
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
        prop_name = prop if isinstance(prop, str) else None

        m = CURRENT_VALUE_RE.match(topic)
        if m:
            loc, slug, cc, ep = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
            node_id = topic_paths.get(f"{loc}/{slug}")
            if node_id is None:
                return
            topic_map[node_id] = f"{prefix}/{loc}/{slug}"
            nodes_with_data.add(node_id)
            add_cc_cap(node_id, ep, cc, prop_name)
            dev = ensure_endpoint(node_id, ep)
            base = f"{prefix}/{loc}/{slug}"
            _apply_cc_value(dev, cc, ep, prop_name, payload, base)
            finalize_endpoint(node_id, ep)
            return

        m = CURRENT_VALUE_NODE_RE.match(topic)
        if m:
            node_slug, cc, ep = m.group(1), int(m.group(2)), int(m.group(3))
            nid_m = NODE_ID_RE.match(node_slug)
            if not nid_m:
                return
            node_id = int(nid_m.group(1))
            nodes_with_data.add(node_id)
            add_cc_cap(node_id, ep, cc, prop_name)
            dev = ensure_endpoint(node_id, ep)
            base = topic_map.get(node_id) or f"{prefix}/{node_slug}"
            _apply_cc_value(dev, cc, ep, prop_name, payload, base)
            finalize_endpoint(node_id, ep)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    try:
        client.connect(host, port, keepalive=30)
    except Exception as exc:
        log.warning("Z-Wave MQTT connect failed: %s", exc)
        return {}

    client.subscribe(f"{prefix}/#")
    client.loop_start()

    refresh_nodes = [
        node_id
        for node_id, info in meta.items()
        if not str(info.get("name", "")).startswith("Node ")
    ]
    for node_id in refresh_nodes:
        _request_node_refresh(client, prefix, gateway, node_id)

    time.sleep(timeout_sec)
    client.loop_stop()
    client.disconnect()

    for node_id, info in meta.items():
        if info["name"].startswith("Node "):
            continue

        eps = sorted(node_endpoints.get(node_id, set()))
        multi = len(eps) > 1

        if not eps:
            key = f"zwave:{node_id}"
            caps = _infer_caps_from_name(info["name"])
            devices[key] = {
                "protocol": "zwave",
                "kind": _classify(info["name"], caps),
                "name": info["name"],
                "room": info["loc"] or None,
                "on": False,
                "brightness": None,
                "controllable": _controllable(caps),
                "node_id": node_id,
                "endpoint": 0,
                "capabilities": caps,
            }
            continue

        for ep in eps:
            rec = endpoint_data[(node_id, ep)]
            caps_list = rec.get("capabilities") or []
            name = info["name"]
            if multi:
                name = f"{info['name']} ({_endpoint_label(caps_list, ep)})"
            dev_id = _device_id_for(node_id, ep, multi)
            out = {
                **rec,
                "name": name,
                "room": info["loc"] or None,
                "node_id": node_id,
                "endpoint": ep,
            }
            for internal in ("_ccs_seen", "_cc38_values", "_mqtt_topics"):
                out.pop(internal, None)
            devices[dev_id] = out

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
