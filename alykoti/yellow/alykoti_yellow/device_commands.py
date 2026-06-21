"""Zigbee2MQTT + Z-Wave JS UI — paritus, nimeäminen."""

from __future__ import annotations

import json
import logging
import time
from urllib.parse import urlparse

import paho.mqtt.client as mqtt

log = logging.getLogger(__name__)


def _parse_mqtt_url(url: str) -> tuple[str, int]:
    parsed = urlparse(url)
    return parsed.hostname or "127.0.0.1", parsed.port or 1883


def _publish(broker_url: str, topic: str, payload: str | dict) -> bool:
    host, port = _parse_mqtt_url(broker_url)
    body = json.dumps(payload) if isinstance(payload, dict) else payload
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    try:
        client.connect(host, port, keepalive=30)
        client.loop_start()
        client.publish(topic, body)
        time.sleep(0.3)
        client.loop_stop()
        client.disconnect()
        return True
    except Exception as exc:
        log.warning("MQTT publish failed (%s): %s", topic, exc)
        return False


def zigbee_permit_join(broker_url: str, prefix: str, seconds: int = 254) -> bool:
    return _publish(
        broker_url,
        f"{prefix}/bridge/request/permit_join",
        {"value": True, "time": max(1, min(254, seconds))},
    )


def zigbee_rename(broker_url: str, prefix: str, old_name: str, new_name: str) -> bool:
    return _publish(
        broker_url,
        f"{prefix}/bridge/request/device/rename",
        {"from": old_name, "to": new_name},
    )


def zwave_start_inclusion(broker_url: str, prefix: str, gateway: str = "Mosquitto") -> bool:
    topic = f"{prefix}/_CLIENTS/ZWAVE_GATEWAY-{gateway}/api/startInclusion/set"
    return _publish(broker_url, topic, {"args": []})


def zwave_stop_inclusion(broker_url: str, prefix: str, gateway: str = "Mosquitto") -> bool:
    topic = f"{prefix}/_CLIENTS/ZWAVE_GATEWAY-{gateway}/api/stopInclusion/set"
    return _publish(broker_url, topic, {"args": []})


def zwave_set_node_name(
    broker_url: str,
    prefix: str,
    node_id: int,
    name: str,
    gateway: str = "Mosquitto",
) -> bool:
    topic = f"{prefix}/_CLIENTS/ZWAVE_GATEWAY-{gateway}/api/setNodeName/set"
    return _publish(broker_url, topic, {"args": [node_id, name]})
