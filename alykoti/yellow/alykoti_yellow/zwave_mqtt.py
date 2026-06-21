"""Z-Wave JS UI → MQTT (prefix zwave)."""

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


def _parse_mqtt_url(url: str) -> tuple[str, int]:
    parsed = urlparse(url)
    return parsed.hostname or "127.0.0.1", parsed.port or 1883


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


def _classify(name: str) -> str:
    n = name.casefold()
    if "lukko" in n:
        return "lock"
    if "kytkin" in n:
        return "switch"
    if "tuuletin" in n or "liesi" in n:
        return "fan"
    if "ovikello" in n or "anturi" in n:
        return "sensor"
    if "valo" in n:
        return "light"
    return "other"


def _controllable(kind: str) -> bool:
    return kind in {"light", "switch", "fan"}


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
    host, port = _parse_mqtt_url(broker_url)
    done = threading.Event()

    def ensure(node_id: int) -> dict[str, Any]:
        key = f"zwave:{node_id}"
        if key not in devices:
            info = meta.get(node_id, {"name": f"Node {node_id}", "loc": ""})
            kind = _classify(info["name"])
            devices[key] = {
                "protocol": "zwave",
                "kind": kind,
                "name": info["name"],
                "room": info["loc"] or None,
                "on": False,
                "brightness": None,
                "controllable": _controllable(kind),
                "node_id": node_id,
            }
        return devices[key]

    def on_message(_client, _userdata, msg):
        topic = msg.topic
        if not topic.startswith(f"{prefix}/"):
            return
        try:
            payload = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            payload = {}

        m = STATUS_RE.match(topic)
        if m:
            node_id = payload.get("nodeId")
            if isinstance(node_id, int):
                topic_map[node_id] = f"{prefix}/{m.group(1)}/{m.group(2)}"
            return

        m = CURRENT_VALUE_RE.match(topic)
        if m:
            loc, slug, cc, ep = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
            node_id = topic_paths.get(f"{loc}/{slug}")
            if node_id is None:
                return
            topic_map[node_id] = f"{prefix}/{loc}/{slug}"
            if cc not in (37, 38):
                return
            dev = ensure(node_id)
            if ep not in (0, 1):
                return
            value = payload.get("value")
            if isinstance(value, bool):
                dev["on"] = value
            elif isinstance(value, (int, float)):
                dev["on"] = value > 0
                if cc == 38:
                    dev["brightness"] = int(value)
            dev["mqtt_set_topic"] = f"{prefix}/{loc}/{slug}/{cc}/{ep}/targetValue"
            return

        m = CURRENT_VALUE_NODE_RE.match(topic)
        if m:
            node_slug, cc, ep = m.group(1), int(m.group(2)), int(m.group(3))
            nid_m = NODE_ID_RE.match(node_slug)
            if not nid_m:
                return
            node_id = int(nid_m.group(1))
            if cc not in (37, 38) or ep not in (0, 1):
                return
            value = payload.get("value")
            dev = ensure(node_id)
            if isinstance(value, bool):
                dev["on"] = value
            elif isinstance(value, (int, float)):
                dev["on"] = value > 0
                if cc == 38:
                    dev["brightness"] = int(value)
            base = topic_map.get(node_id) or f"{prefix}/{node_slug}"
            dev["mqtt_set_topic"] = f"{base}/{cc}/{ep}/targetValue"

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
        kind = _classify(info["name"])
        if kind == "sensor":
            continue
        dev = ensure(node_id)
        if kind == "lock":
            dev["controllable"] = False

    return {
        k: v
        for k, v in devices.items()
        if not str(v.get("name", "")).startswith("Node ")
        and v.get("kind") not in {"sensor", "other"}
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
