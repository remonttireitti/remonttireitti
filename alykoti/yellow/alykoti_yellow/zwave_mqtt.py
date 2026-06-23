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
# Named-topics gateway: multi-segment loc/name paths.
CV_TV_RE = re.compile(r"^(.+)/(\d+)/(\d+)/(currentValue|targetValue)$")
CONFIG_PARAM_RE = re.compile(r"^(.+)/112/0/(\d+)$")
NAMED_VALUE_RE = re.compile(r"^(.+)/(\d+)/(\d+)/([^/]+)$")
STATUS_SUFFIX_RE = re.compile(r"^(.+)/status$")

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
    128: [("battery", True, False)],
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


def _cc48_sensor_state(prop: str | None) -> str | None:
    p = (prop or "").casefold()
    if any(x in p for x in ("water", "leak", "flood", "moisture")):
        return "water_leak"
    if any(x in p for x in ("smoke", "fire")):
        return "smoke"
    if "carbon" in p or p == "co":
        return "co"
    if "motion" in p:
        return "motion"
    if "tamper" in p:
        return "tamper"
    if any(x in p for x in ("door", "window", "contact")):
        return "contact"
    return None


def _cc113_sensor_state(prop: str | None, value: Any) -> str | None:
    p = (prop or "").casefold()
    if "water" in p or "leak" in p or "flood" in p:
        return "water_leak"
    if "smoke" in p or "fire" in p:
        return "smoke"
    if "co " in p or p.startswith("co") or "carbon" in p:
        return "co"
    if "home security" in p or "intrusion" in p or "motion" in p:
        return "motion"
    if "access control" in p or "door" in p or "window" in p:
        return "contact"
    if isinstance(value, str):
        v = value.casefold()
        if "water" in v or "leak" in v or "flood" in v:
            return "water_leak"
        if "smoke" in v or "fire" in v:
            return "smoke"
        if "motion" in v or "occupancy" in v or "intrusion" in v:
            return "motion"
        if "door" in v or "window" in v or "access" in v:
            return "contact"
    return None


def _property_caps(cc: int, prop: str | None) -> list[tuple[str, bool, bool]]:
    p = (prop or "").casefold()
    if cc == 49:
        if "humidity" in p:
            return [("humidity", True, False)]
        if "co2" in p or "carbon dioxide" in p:
            return [("co2", True, False)]
        if "luminance" in p or "illuminance" in p:
            return [("illuminance", True, False)]
        if "voltage" in p:
            return [("meter", True, False)]
        if "temperature" in p or "air" in p:
            return [("temperature", True, False)]
        return [("temperature", True, False)]
    if cc == 48:
        state = _cc48_sensor_state(prop)
        if state == "water_leak":
            return [("water_leak", True, False)]
        if state == "smoke":
            return [("smoke", True, False)]
        if state == "co":
            return [("co2", True, False)]
        if state == "motion":
            return [("motion", True, False)]
        if state in ("contact", "tamper"):
            return [("contact", True, False)]
        return [("input", True, False)]
    if cc == 113:
        state = _cc113_sensor_state(prop, None)
        if state == "water_leak":
            return [("water_leak", True, False)]
        if state == "smoke":
            return [("smoke", True, False)]
        if state == "co":
            return [("co2", True, False)]
        if state == "motion":
            return [("motion", True, False)]
        if state == "contact":
            return [("contact", True, False)]
        return []
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


def _mqtt_device_path(loc: str, name: str) -> str:
    """Z-Wave JS UI named-topics path: loc/name_parts with spaces → underscores."""
    parts = [_slug(p) for p in name.split("/") if p.strip()]
    loc = loc.strip()
    if loc:
        return f"{loc}/{'/'.join(parts)}"
    return "/".join(parts)


def _build_topic_paths(meta: dict[int, dict[str, str]]) -> dict[str, int]:
    paths: dict[str, int] = {}
    for node_id, info in meta.items():
        path = _mqtt_device_path(info.get("loc") or "", info["name"])
        if path:
            paths[path] = node_id
        paths[f"nodeID_{node_id}"] = node_id
    return paths


def _resolve_node_from_topic(
    rest: str,
    topic_paths: dict[str, int],
    topic_map: dict[int, str],
    prefix: str,
    payload_node_id: int | None = None,
) -> tuple[int, str] | None:
    """Match longest known MQTT base path inside topic rest segment."""
    if isinstance(payload_node_id, int):
        base = topic_map.get(payload_node_id)
        if base:
            base_rest = base.removeprefix(f"{prefix}/")
            if rest == base_rest or rest.startswith(f"{base_rest}/"):
                return payload_node_id, base

    best_nid: int | None = None
    best_path = ""
    for path, node_id in topic_paths.items():
        if path.startswith("nodeID_"):
            continue
        if rest == path or rest.startswith(f"{path}/"):
            if len(path) > len(best_path):
                best_nid = node_id
                best_path = path
    if best_nid is not None:
        return best_nid, f"{prefix}/{best_path}"
    return None


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
        if "palohälytin" in n or "palohalytin" in n or "smoke" in n:
            return [
                _cap("smoke", True, False),
                _cap("temperature", True, False),
                _cap("battery", True, False),
            ]
        if "vesivuoto" in n or "water leak" in n or "leak" in n:
            return [
                _cap("water_leak", True, False),
                _cap("temperature", True, False),
                _cap("battery", True, False),
            ]
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


def _endpoint_label(caps: list[dict[str, Any]], endpoint: int, ccs: set[int] | None = None) -> str:
    ids = {c["id"] for c in caps}
    ccs = ccs or set()
    writable_switch = any(
        c["id"] in {"switch", "relay", "dimmer"} and c.get("write") for c in caps
    )
    if writable_switch or (37 in ccs and endpoint in (1, 2)):
        return f"Rele OUT {endpoint}"
    if ids & {"switch", "dimmer"} and not writable_switch:
        return f"Tulo IN {endpoint}"
    if "contact" in ids or 48 in ccs:
        return f"Tulo IN {endpoint}"
    if "meter" in ids or (49 in ccs and endpoint in (3, 4)):
        return f"Tulo IN {endpoint} (jännite)"
    if "temperature" in ids:
        return f"Lämpöanturi {endpoint}"
    if "humidity" in ids:
        return f"Kosteus {endpoint}"
    if "illuminance" in ids:
        return f"Valoisuus {endpoint}"
    if "motion" in ids:
        return f"Liike {endpoint}"
    if "lock" in ids:
        return f"Lukko {endpoint}"
    if ids & {"switch", "relay", "dimmer"}:
        return f"Rele {endpoint}"
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
    """Align switch/dimmer caps with observed CC 37/38 — binary CC38 is a switch, not a dimmer."""
    ccs: set[int] = dev.get("_ccs_seen") or set()
    cc38_values: set[int] = dev.get("_cc38_values") or set()
    cc38_binary = _cc38_values_binary(cc38_values)

    if 37 in ccs:
        caps_map.pop("dimmer", None)
        # CC37 may arrive without a prior cap merge — always ensure a writable switch.
        _merge_cap(caps_map, _cap("switch", True, True))
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
            elif "voltage" in p:
                dev["voltage_v"] = float(value)
            elif "temperature" in p or "air" in p or not p:
                dev["temperature_c"] = float(value)
    elif cc == 50:
        if isinstance(value, (int, float)):
            dev["power_w"] = float(value)
    elif cc == 48:
        if isinstance(value, bool):
            dev["on"] = value
        elif isinstance(value, (int, float)):
            dev["on"] = value > 0
        state = _cc48_sensor_state(prop_name)
        if state:
            dev["sensor_state"] = state
    elif cc == 113:
        state = _cc113_sensor_state(prop_name, value)
        if state:
            dev["sensor_state"] = state
        on = _zwave_value_to_on(value)
        if on is not None:
            dev["on"] = on
    elif cc == 128:
        if isinstance(value, (int, float)):
            dev["battery_pct"] = float(value)


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
        if any(x in v for x in ("alarm", "smoke", "fire", "leak", "water", "intrusion")):
            if "idle" in v or "clear" in v or "no " in v:
                return False
            return True
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


def _request_poll_value(
    client: mqtt.Client,
    prefix: str,
    gateway: str,
    node_id: int,
    cc: int,
    endpoint: int,
    prop: str = "currentValue",
) -> None:
    """Poll switch/dimmer value so silent relay endpoints appear in MQTT during scan."""
    topic = f"{prefix}/_CLIENTS/ZWAVE_GATEWAY-{gateway}/api/pollValue/set"
    try:
        client.publish(
            topic,
            json.dumps(
                {
                    "args": [
                        {
                            "nodeId": node_id,
                            "commandClass": cc,
                            "endpoint": endpoint,
                            "property": prop,
                        }
                    ]
                }
            ),
        )
    except Exception as exc:
        log.debug(
            "Z-Wave pollValue failed node %s ep %s cc %s: %s",
            node_id,
            endpoint,
            cc,
            exc,
        )


def _probe_switch_endpoints(
    client: mqtt.Client,
    prefix: str,
    gateway: str,
    node_ids: list[int],
) -> None:
    """Releet ja himmentimet eivät aina julkaise currentValuea — pollaa CC 37/38."""
    for node_id in node_ids:
        for ep in range(0, 10):
            for cc in (37, 38):
                _request_poll_value(client, prefix, gateway, node_id, cc, ep)
        time.sleep(0.05)


def _property_label(cc: int, prop: str | None, endpoint: int = 0) -> str:
    p = (prop or "").replace("_", " ")
    ep_suffix = f" {endpoint}" if endpoint > 0 else ""
    if cc == 37:
        return f"Rele OUT{ep_suffix}"
    if cc == 38:
        return f"Himmennys{ep_suffix}"
    if cc == 48:
        return f"Tulo IN{ep_suffix}"
    if cc == 49:
        pl = (prop or "").casefold()
        if "humidity" in pl:
            return f"Kosteus{ep_suffix}"
        if "voltage" in pl:
            return f"Jännite IN{ep_suffix}"
        if "temperature" in pl or "air" in pl:
            return f"Lämpöanturi{ep_suffix}"
        if "luminance" in pl:
            return f"Valoisuus{ep_suffix}"
        return (p or "Arvo") + ep_suffix
    if cc == 50:
        return f"Teho{ep_suffix}"
    if cc == 112:
        return f"Param {prop}"
    return (p or f"CC {cc}") + ep_suffix


def _config_param_label(param: int) -> str:
    known = {
        1: "Backlight",
        2: "LED Indicator",
        3: "State After Power Failure",
        4: "Root Device Mapped Setting",
    }
    return known.get(param, f"Param {param}")


def _mqtt_client(_broker_url: str) -> mqtt.Client:
    try:
        return mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        return mqtt.Client()


_mqtt_publish_lock = threading.Lock()
_mqtt_publishers: dict[str, mqtt.Client] = {}


def _get_mqtt_publisher(broker_url: str) -> mqtt.Client:
    with _mqtt_publish_lock:
        existing = _mqtt_publishers.get(broker_url)
        if existing is not None:
            return existing
        host, port = _parse_mqtt_url(broker_url)
        client = _mqtt_client(broker_url)
        client.connect(host, port, keepalive=60)
        client.loop_start()
        _mqtt_publishers[broker_url] = client
        return client


def _publish_mqtt_value(broker_url: str, topic: str, value: Any) -> bool:
    payload = json.dumps({"value": value})
    set_topic = topic if topic.endswith("/set") else f"{topic}/set"
    try:
        client = _get_mqtt_publisher(broker_url)
        info = client.publish(set_topic, payload, qos=1)
        info.wait_for_publish(timeout=2.0)
        return True
    except Exception as exc:
        log.warning("Z-Wave MQTT publish failed (%s): %s", topic, exc)
        with _mqtt_publish_lock:
            stale = _mqtt_publishers.pop(broker_url, None)
        if stale is not None:
            try:
                stale.loop_stop()
                stale.disconnect()
            except Exception:
                pass
        return False


def fetch_zwave_devices(
    broker_url: str,
    prefix: str,
    nodes_json: str,
    timeout_sec: float = 8.0,
    gateway: str = "Mosquitto",
) -> dict[str, Any]:
    """Return {devices: home_devices dict, nodes: zwave_nodes dict}."""
    meta = _load_node_names(nodes_json)
    topic_paths = _build_topic_paths(meta)
    devices: dict[str, dict[str, Any]] = {}
    topic_map: dict[int, str] = {}
    node_caps: dict[tuple[int, int], dict[str, dict[str, Any]]] = {}
    endpoint_data: dict[tuple[int, int], dict[str, Any]] = {}
    node_endpoints: dict[int, set[int]] = {}
    node_configs: dict[int, list[dict[str, Any]]] = {}
    node_properties: dict[int, list[dict[str, Any]]] = {}
    node_bases: dict[int, str] = {}
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
                "zwave_properties": [],
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

    def add_property(
        node_id: int,
        endpoint: int,
        cc: int,
        prop: str | None,
        value: Any,
        mqtt_topic: str,
        writable: bool,
    ) -> None:
        label = _property_label(cc, prop, endpoint)
        entry = {
            "cc": cc,
            "endpoint": endpoint,
            "property": prop,
            "label": label,
            "value": value,
            "mqtt_topic": mqtt_topic,
            "writable": writable,
        }
        props = node_properties.setdefault(node_id, [])
        key = (cc, endpoint, prop or "")
        for i, existing in enumerate(props):
            if (existing["cc"], existing["endpoint"], existing.get("property") or "") == key:
                props[i] = entry
                return
        props.append(entry)

        dev = ensure_endpoint(node_id, endpoint)
        zprops: list[dict[str, Any]] = dev.setdefault("zwave_properties", [])
        for i, existing in enumerate(zprops):
            if (existing["cc"], existing["endpoint"], existing.get("property") or "") == key:
                zprops[i] = entry
                return
        zprops.append(entry)

    def add_config(node_id: int, param: int, value: Any, mqtt_topic: str) -> None:
        entry = {
            "param": param,
            "label": _config_param_label(param),
            "value": value,
            "mqtt_topic": mqtt_topic,
            "writable": True,
        }
        configs = node_configs.setdefault(node_id, [])
        for i, existing in enumerate(configs):
            if existing["param"] == param:
                configs[i] = entry
                return
        configs.append(entry)

    def finalize_endpoint(node_id: int, endpoint: int) -> None:
        dev = ensure_endpoint(node_id, endpoint)
        key = (node_id, endpoint)
        caps_map = node_caps.setdefault(key, {})
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

    def handle_value_topic(
        node_id: int,
        base: str,
        cc: int,
        ep: int,
        prop_name: str | None,
        payload: dict[str, Any],
        mqtt_topic: str,
        is_target: bool,
    ) -> None:
        topic_map[node_id] = base
        node_bases[node_id] = base
        add_cc_cap(node_id, ep, cc, prop_name)
        dev = ensure_endpoint(node_id, ep)
        _apply_cc_value(dev, cc, ep, prop_name, payload, base)
        value = payload.get("value")
        writable = is_target or cc in (37, 38, 62, 98)
        set_topic = mqtt_topic
        if not is_target and cc in (37, 38):
            set_topic = mqtt_topic.replace("/currentValue", "/targetValue")
        add_property(node_id, ep, cc, prop_name, value, set_topic, writable)
        finalize_endpoint(node_id, ep)

    def on_message(_client, _userdata, msg):
        topic = msg.topic
        if not topic.startswith(f"{prefix}/"):
            return
        rest = topic.removeprefix(f"{prefix}/")
        try:
            payload = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            payload = {}
        if not isinstance(payload, dict):
            payload = {}

        payload_node_id = payload.get("nodeId") if isinstance(payload.get("nodeId"), int) else None

        m = STATUS_SUFFIX_RE.match(rest)
        if m:
            resolved = _resolve_node_from_topic(
                m.group(1), topic_paths, topic_map, prefix, payload_node_id
            )
            if resolved:
                node_id, base = resolved
                topic_map[node_id] = base
                node_bases[node_id] = base
            return

        prop = payload.get("property")
        prop_name = prop if isinstance(prop, str) else None

        m = CV_TV_RE.match(rest)
        if m:
            resolved = _resolve_node_from_topic(
                m.group(1), topic_paths, topic_map, prefix, payload_node_id
            )
            if resolved is None:
                return
            node_id, base = resolved
            cc, ep = int(m.group(2)), int(m.group(3))
            handle_value_topic(
                node_id,
                base,
                cc,
                ep,
                prop_name,
                payload,
                topic,
                m.group(4) == "targetValue",
            )
            return

        m = CONFIG_PARAM_RE.match(rest)
        if m:
            resolved = _resolve_node_from_topic(
                m.group(1), topic_paths, topic_map, prefix, payload_node_id
            )
            if resolved is None:
                return
            node_id, base = resolved
            param = int(m.group(2))
            topic_map[node_id] = base
            node_bases[node_id] = base
            add_config(node_id, param, payload.get("value"), topic)
            return

        m = NAMED_VALUE_RE.match(rest)
        if m:
            resolved = _resolve_node_from_topic(
                m.group(1), topic_paths, topic_map, prefix, payload_node_id
            )
            if resolved is None:
                return
            node_id, base = resolved
            cc, ep = int(m.group(2)), int(m.group(3))
            prop_part = m.group(4)
            if cc == 112:
                return
            prop_name = prop_part
            topic_map[node_id] = base
            node_bases[node_id] = base
            add_cc_cap(node_id, ep, cc, prop_name)
            dev = ensure_endpoint(node_id, ep)
            _apply_cc_value(dev, cc, ep, prop_name, payload, base)
            add_property(
                node_id,
                ep,
                cc,
                prop_name,
                payload.get("value"),
                topic,
                cc in (37, 38, 62, 98),
            )
            finalize_endpoint(node_id, ep)
            return

        legacy = f"{prefix}/{rest}"
        m = CURRENT_VALUE_RE.match(legacy)
        if m:
            loc, slug, cc, ep = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
            node_id = topic_paths.get(f"{loc}/{slug}")
            if node_id is None:
                return
            base = f"{prefix}/{loc}/{slug}"
            handle_value_topic(node_id, base, cc, ep, prop_name, payload, legacy, False)
            return

        m = CURRENT_VALUE_NODE_RE.match(legacy)
        if m:
            node_slug, cc, ep = m.group(1), int(m.group(2)), int(m.group(3))
            nid_m = NODE_ID_RE.match(node_slug)
            if not nid_m:
                return
            node_id = int(nid_m.group(1))
            base = topic_map.get(node_id) or f"{prefix}/{node_slug}"
            handle_value_topic(node_id, base, cc, ep, prop_name, payload, legacy, False)

    client = _mqtt_client(broker_url)
    client.on_message = on_message
    try:
        client.connect(host, port, keepalive=30)
    except Exception as exc:
        log.warning("Z-Wave MQTT connect failed: %s", exc)
        return {"devices": {}, "nodes": {}}

    client.subscribe(f"{prefix}/#")
    client.loop_start()

    refresh_nodes = [
        node_id
        for node_id, info in meta.items()
        if not str(info.get("name", "")).startswith("Node ")
    ]
    for node_id in refresh_nodes:
        _request_node_refresh(client, prefix, gateway, node_id)

    _probe_switch_endpoints(client, prefix, gateway, refresh_nodes)

    time.sleep(timeout_sec)
    client.loop_stop()
    client.disconnect()

    zwave_nodes: dict[str, dict[str, Any]] = {}

    for node_id, info in meta.items():
        if info["name"].startswith("Node "):
            continue

        eps = sorted(node_endpoints.get(node_id, set()))
        controllable_eps = [
            e
            for e in eps
            if _controllable(sorted(node_caps.get((node_id, e), {}).values(), key=lambda c: c["id"]))
        ]
        multi = len(eps) > 1
        base = node_bases.get(node_id) or topic_map.get(node_id)
        if not base:
            path = _mqtt_device_path(info.get("loc") or "", info["name"])
            if path:
                base = f"{prefix}/{path}"

        endpoint_out: list[dict[str, Any]] = []
        for ep in eps:
            rec = endpoint_data[(node_id, ep)]
            caps_list = rec.get("capabilities") or []
            ccs_seen: set[int] = rec.get("_ccs_seen") or set()
            if ep == 0 and multi and not _controllable(caps_list) and not caps_list:
                continue
            name = info["name"]
            label = _endpoint_label(caps_list, ep, ccs_seen) if multi else info["name"]
            if multi:
                name = f"{info['name']} ({label})"
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
            endpoint_out.append(
                {
                    "endpoint": ep,
                    "device_id": dev_id,
                    "label": label,
                    "on": out.get("on", False),
                    "brightness": out.get("brightness"),
                    "controllable": out.get("controllable", False),
                    "mqtt_set_topic": out.get("mqtt_set_topic"),
                    "control_cc": out.get("control_cc"),
                    "capabilities": out.get("capabilities") or [],
                    "properties": out.get("zwave_properties") or [],
                }
            )

        endpoint_out = [e for e in endpoint_out if e["controllable"] or e["endpoint"] != 0]

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

        zwave_nodes[str(node_id)] = {
            "node_id": node_id,
            "name": info["name"],
            "room": info["loc"] or None,
            "base_topic": base,
            "endpoints": endpoint_out,
            "config": sorted(node_configs.get(node_id, []), key=lambda c: c["param"]),
            "properties": node_properties.get(node_id, []),
        }

    filtered_devices = {
        k: v
        for k, v in devices.items()
        if not str(v.get("name", "")).startswith("Node ")
    }

    return {"devices": filtered_devices, "nodes": zwave_nodes}


def set_zwave_property(broker_url: str, mqtt_topic: str, value: Any) -> bool:
    """Publish any Z-Wave value (switch, config param, etc.)."""
    return _publish_mqtt_value(broker_url, mqtt_topic, value)


def set_zwave_device(
    broker_url: str,
    mqtt_set_topic: str,
    on: bool,
    brightness: int | None = None,
) -> bool:
    value: bool | int = brightness if brightness is not None else on
    return set_zwave_property(broker_url, mqtt_set_topic, value)


def set_zwave_lock(broker_url: str, lock_set_topic: str, locked: bool) -> bool:
    return set_zwave_property(broker_url, lock_set_topic, locked)
