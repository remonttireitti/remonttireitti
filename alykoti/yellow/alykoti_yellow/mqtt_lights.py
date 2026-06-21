"""Zigbee2MQTT valot paikallisesta Mosquitto-brokerista."""

from __future__ import annotations

import json
import logging
import threading
import time
from typing import Any
from urllib.parse import urlparse

import paho.mqtt.client as mqtt

log = logging.getLogger(__name__)


def _parse_mqtt_url(url: str) -> tuple[str, int]:
    parsed = urlparse(url)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 1883
    return host, port


def _is_light(device: dict[str, Any]) -> bool:
    if device.get("type") == "Coordinator":
        return False
    exposes = device.get("definition", {}).get("exposes", [])

    def scan(items: list[Any]) -> bool:
        for item in items:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "light":
                return True
            if item.get("name") == "state":
                return True
            feats = item.get("features")
            if isinstance(feats, list) and scan(feats):
                return True
        return False

    return scan(exposes)


def _device_topic_name(prefix: str, topic: str) -> str | None:
    head = f"{prefix}/"
    if not topic.startswith(head) or topic.startswith(f"{prefix}/bridge"):
        return None
    name = topic[len(head) :]
    return name or None


def _is_remote_or_switch(device: dict[str, Any]) -> bool:
    if device.get("type") == "Coordinator" or _is_light(device):
        return False
    exposes = device.get("definition", {}).get("exposes", [])

    def scan(items: list[Any]) -> str | None:
        for item in items:
            if not isinstance(item, dict):
                continue
            if item.get("type") in ("contact", "occupancy", "temperature", "humidity"):
                return "sensor"
            if item.get("name") in ("contact", "occupancy", "temperature", "water_leak"):
                return "sensor"
            if item.get("type") == "switch" or item.get("name") == "action":
                return "switch"
            feats = item.get("features")
            if isinstance(feats, list):
                hit = scan(feats)
                if hit:
                    return hit
        return None

    kind = scan(exposes)
    if kind == "sensor":
        return False
    if kind == "switch":
        return True
    name = str(device.get("friendly_name", "")).casefold()
    return "säädin" in name or "kytkin" in name or "dimmer" in name


def fetch_zigbee_home(
    broker_url: str, prefix: str, timeout_sec: float = 5.0
) -> dict[str, dict[str, Any]]:
    """Palauttaa zigbee:<nimi> → {protocol, kind, name, on, ...}."""
    raw = fetch_lights(broker_url, prefix, timeout_sec)
    out: dict[str, dict[str, Any]] = {}
    for name, state in raw.items():
        key = f"zigbee:{name}"
        out[key] = {
            "protocol": "zigbee",
            "kind": "light",
            "name": state.get("name") or name,
            "on": state.get("on", False),
            "brightness": state.get("brightness"),
            "controllable": True,
        }

    host, port = _parse_mqtt_url(broker_url)
    switches: dict[str, dict[str, Any]] = {}

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
            if not name or _is_light(dev) or not _is_remote_or_switch(dev):
                continue
            key = f"zigbee:{name}"
            switches[key] = {
                "protocol": "zigbee",
                "kind": "switch",
                "name": str(name),
                "on": False,
                "brightness": None,
                "controllable": False,
            }

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

    out.update(switches)
    return out


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
    host, port = _parse_mqtt_url(broker_url)
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    try:
        client.connect(host, port, keepalive=30)
        client.loop_start()
        client.publish(f"{prefix}/{light_id}/set", payload)
        time.sleep(0.3)
        client.loop_stop()
        client.disconnect()
        return True
    except Exception as exc:
        log.warning("MQTT set light failed: %s", exc)
        return False
