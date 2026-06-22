"""Zigbee2MQTT-painikkeet → valosäännöt (paikallinen suoritus)."""

from __future__ import annotations

import json
import logging
import threading
from typing import Any

import paho.mqtt.client as mqtt

from alykoti_yellow import config
from alykoti_yellow.mqtt_lights import (
    _device_topic_name,
    _parse_mqtt_url,
    publish_light,
    set_light,
    set_light_brightness,
    set_light_color_hue,
)
from alykoti_yellow.shelly import set_shelly_switch
from alykoti_yellow.tasmota import set_tasmota_power
from alykoti_yellow.zwave_mqtt import set_zwave_device, set_zwave_lock

log = logging.getLogger(__name__)

SHORT_PRESS = frozenset(
    {
        "single",
        "single_click",
        "click",
        "on",
        "off",
        "toggle",
        "1_click",
        "2_click",
        "3_click",
        "4_click",
        "left_click",
        "right_click",
        "up",
        "down",
        "open",
        "close",
        "stop",
        "brightness_up",
        "brightness_down",
    }
)
LONG_PRESS = frozenset(
    {
        "hold",
        "long",
        "long_press",
        "long_click",
        "release",
        "1_hold",
        "2_hold",
        "3_hold",
        "4_hold",
        "left_hold",
        "right_hold",
    }
)
DOUBLE_PRESS = frozenset(
    {
        "double",
        "double_click",
        "1_double",
        "2_double",
        "3_double",
        "4_double",
        "left_double",
        "right_double",
    }
)

COLOR_PRESETS = [
    {"hue": 0, "saturation": 254},
    {"hue": 28, "saturation": 254},
    {"hue": 85, "saturation": 254},
    {"hue": 128, "saturation": 254},
    {"hue": 170, "saturation": 254},
    {"hue": 213, "saturation": 254},
]

BRIGHTNESS_STEP = 40


def _press_aliases(press: str) -> frozenset[str]:
    if press == "long":
        return LONG_PRESS
    if press == "double":
        return DOUBLE_PRESS
    return SHORT_PRESS


def _match_action(incoming: str, press: str) -> bool:
    action = incoming.strip().casefold()
    if not action:
        return False
    aliases = _press_aliases(press)
    if action in aliases:
        return True
    for alias in aliases:
        if action.endswith(f"_{alias}") or action.startswith(f"{alias}_"):
            return True
    return False


def _match_button(incoming_button: str | None, rule_button: str | None) -> bool:
    if not rule_button:
        return True
    if not incoming_button:
        return False
    return incoming_button.strip().casefold() == rule_button.strip().casefold()


class AutomationEngine:
    """Kuuntelee Zigbee2MQTT action-viestejä ja suorittaa säännöt."""

    def __init__(self) -> None:
        self._rules: list[dict[str, Any]] = []
        self._integrations: dict[str, Any] = {}
        self._home_devices: dict[str, Any] = {}
        self._light_state: dict[str, dict[str, Any]] = {}
        self._color_index: dict[str, int] = {}
        self._lock = threading.Lock()
        self._client: mqtt.Client | None = None
        self._thread: threading.Thread | None = None

    def update_config(
        self,
        rules: list[Any] | None,
        integrations: dict[str, Any] | None = None,
        home_devices: dict[str, Any] | None = None,
    ) -> None:
        enabled: list[dict[str, Any]] = []
        if isinstance(rules, list):
            for item in rules:
                if not isinstance(item, dict) or not item.get("enabled", True):
                    continue
                trigger = item.get("trigger")
                if isinstance(trigger, dict):
                    kind = trigger.get("kind") or trigger.get("type")
                    if kind == "electricity_price":
                        continue
                enabled.append(item)
        with self._lock:
            self._rules = enabled
            if isinstance(integrations, dict):
                self._integrations = integrations
            if isinstance(home_devices, dict):
                for device_id, meta in home_devices.items():
                    if isinstance(meta, dict):
                        self._light_state.setdefault(device_id, {
                            "on": bool(meta.get("on")),
                            "brightness": meta.get("brightness") if isinstance(meta.get("brightness"), (int, float)) else 128,
                        })
                self._home_devices = home_devices
            elif not hasattr(self, "_home_devices"):
                self._home_devices = {}
        log.info("Automaatiot päivitetty: %s aktiivista sääntöä", len(enabled))

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run, name="automation-mqtt", daemon=True)
        self._thread.start()

    def _run(self) -> None:
        host, port = _parse_mqtt_url(config.MQTT_URL)
        prefix = config.MQTT_PREFIX

        def on_connect(client, _userdata, _flags, _reason_code, _properties):
            client.subscribe(f"{prefix}/#")
            log.info("Automaatio MQTT kuuntelee %s/#", prefix)

        def on_message(_client, _userdata, msg):
            topic = msg.topic
            name = _device_topic_name(prefix, topic)
            if not name:
                return
            try:
                payload = json.loads(msg.payload.decode())
            except (json.JSONDecodeError, UnicodeDecodeError):
                return
            if not isinstance(payload, dict):
                return

            device_key = f"zigbee:{name}"
            if "action" in payload:
                action = str(payload.get("action", ""))
                button = payload.get("button")
                button_str = str(button) if button is not None else None
                self._handle_action(device_key, action, button_str)
                return

            if "state" in payload or "brightness" in payload:
                with self._lock:
                    st = self._light_state.setdefault(device_key, {"on": False, "brightness": 128})
                    if "state" in payload:
                        st["on"] = payload.get("state") == "ON"
                    if "brightness" in payload and isinstance(payload["brightness"], (int, float)):
                        st["brightness"] = int(payload["brightness"])

        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        client.on_connect = on_connect
        client.on_message = on_message
        self._client = client

        while True:
            try:
                client.connect(host, port, keepalive=60)
                client.loop_forever()
            except Exception as exc:
                log.warning("Automaatio MQTT yhteys katkesi: %s", exc)
                import time

                time.sleep(5)

    def _handle_action(self, device_key: str, action: str, button: str | None) -> None:
        with self._lock:
            rules = list(self._rules)
        for rule in rules:
            trigger = rule.get("trigger") if isinstance(rule.get("trigger"), dict) else {}
            if trigger.get("device_id") != device_key:
                continue
            press = str(trigger.get("press", "short"))
            rule_button = trigger.get("button")
            rule_button_str = str(rule_button) if isinstance(rule_button, str) and rule_button.strip() else None
            rule_action = trigger.get("action")
            rule_action_str = str(rule_action) if isinstance(rule_action, str) and rule_action.strip() else None
            if rule_action_str:
                if action.strip().casefold() != rule_action_str.strip().casefold():
                    continue
            elif not _match_action(action, press):
                continue
            if not _match_button(button, rule_button_str):
                continue
            act = rule.get("action") if isinstance(rule.get("action"), dict) else {}
            targets = act.get("target_ids")
            if not isinstance(targets, list):
                continue
            action_type = str(act.get("type", ""))
            log.info(
                "Automaatio: %s action=%s → %s (%s kohdetta)",
                device_key,
                action,
                action_type,
                len(targets),
            )
            for target_id in targets:
                if isinstance(target_id, str):
                    self._execute_target(target_id, action_type, act)

    def _get_light_state(self, device_id: str) -> dict[str, Any]:
        with self._lock:
            return dict(self._light_state.get(device_id, {"on": False, "brightness": 128}))

    def _set_light_state(self, device_id: str, on: bool, brightness: int | None = None) -> None:
        with self._lock:
            st = self._light_state.setdefault(device_id, {"on": False, "brightness": 128})
            st["on"] = on
            if brightness is not None:
                st["brightness"] = brightness

    def _execute_target(self, device_id: str, action_type: str, act: dict[str, Any]) -> None:
        st = self._get_light_state(device_id)
        brightness = int(st.get("brightness") or 128)
        on = bool(st.get("on"))

        if action_type == "on":
            self._apply(device_id, True, brightness if brightness > 0 else 200)
            return
        if action_type == "off":
            self._apply(device_id, False, brightness)
            return
        if action_type == "toggle":
            self._apply(device_id, not on, brightness if not on else max(brightness, 40))
            return
        if action_type == "brightness_up":
            self._apply(device_id, True, min(254, brightness + BRIGHTNESS_STEP))
            return
        if action_type == "brightness_down":
            new_b = max(0, brightness - BRIGHTNESS_STEP)
            self._apply(device_id, new_b > 0, new_b)
            return
        if action_type == "set_brightness":
            pct = act.get("brightness_pct")
            if isinstance(pct, (int, float)):
                b = max(0, min(254, int(round(float(pct) / 100 * 254))))
                self._apply(device_id, b > 0, b)
            return
        if action_type in ("color_next", "color_prev"):
            if not device_id.startswith("zigbee:"):
                log.debug("Värin vaihto vain Zigbee-valoille: %s", device_id)
                return
            zigbee_name = device_id.removeprefix("zigbee:")
            with self._lock:
                idx = self._color_index.get(device_id, 0)
                if action_type == "color_next":
                    idx = (idx + 1) % len(COLOR_PRESETS)
                else:
                    idx = (idx - 1) % len(COLOR_PRESETS)
                self._color_index[device_id] = idx
                preset = COLOR_PRESETS[idx]
            ok = set_light_color_hue(
                config.MQTT_URL,
                config.MQTT_PREFIX,
                zigbee_name,
                preset["hue"],
                preset["saturation"],
            )
            if ok:
                self._set_light_state(device_id, True, brightness)
            return

        if action_type in ("lock", "unlock", "toggle_lock"):
            locked = action_type == "lock"
            if action_type == "toggle_lock":
                meta = self._home_devices.get(device_id)
                locked = not bool(isinstance(meta, dict) and meta.get("locked"))
            self._apply_lock(device_id, locked)
            return

        log.warning("Tuntematon automaatiotoiminto: %s", action_type)

    def _apply_lock(self, device_id: str, locked: bool) -> None:
        topic = self._lock_topic(device_id)
        if not topic:
            log.warning("Lukon ohjaus: ei lock_set_topic (%s)", device_id)
            return
        ok = set_zwave_lock(config.MQTT_URL, topic, locked)
        if ok:
            with self._lock:
                st = self._light_state.setdefault(device_id, {"on": False, "brightness": 128})
                st["on"] = locked
            meta = self._home_devices.get(device_id)
            if isinstance(meta, dict):
                meta["locked"] = locked
                meta["on"] = locked

    def _apply(self, device_id: str, on: bool, brightness: int) -> None:
        ok = False
        if device_id.startswith("zigbee:"):
            zigbee_name = device_id.removeprefix("zigbee:")
            if on and brightness > 0:
                ok = set_light_brightness(config.MQTT_URL, config.MQTT_PREFIX, zigbee_name, brightness, True)
            else:
                ok = set_light(config.MQTT_URL, config.MQTT_PREFIX, zigbee_name, on)
        elif device_id.startswith("zwave:"):
            topic = self._zwave_topic(device_id)
            if topic:
                ok = set_zwave_device(config.MQTT_URL, topic, on)
        elif device_id.startswith("shelly:"):
            meta = self._shelly_meta(device_id)
            if meta:
                ok = set_shelly_switch(meta["host"], meta["channel"], on, gen=meta.get("gen", 2))
        elif device_id.startswith("tasmota:"):
            meta = self._tasmota_meta(device_id)
            if meta:
                ok = set_tasmota_power(meta["host"], meta["channel"], on)
        else:
            ok = set_light(config.MQTT_URL, config.MQTT_PREFIX, device_id, on)

        if ok:
            self._set_light_state(device_id, on, brightness if on else brightness)

    def _zwave_topic(self, device_id: str) -> str | None:
        meta = self._home_devices.get(device_id)
        if isinstance(meta, dict):
            topic = meta.get("mqtt_set_topic")
            if isinstance(topic, str) and topic.strip():
                return topic.strip()
        return None

    def _lock_topic(self, device_id: str) -> str | None:
        meta = self._home_devices.get(device_id)
        if isinstance(meta, dict):
            topic = meta.get("lock_set_topic")
            if isinstance(topic, str) and topic.strip():
                return topic.strip()
        return None

    def _shelly_meta(self, device_id: str) -> dict[str, Any] | None:
        # device_id: shelly:host:channel
        parts = device_id.split(":")
        if len(parts) < 3:
            return None
        host = parts[1]
        try:
            channel = int(parts[2])
        except ValueError:
            return None
        gen = 2
        for dev in (self._integrations.get("shelly") or {}).get("devices") or []:
            if isinstance(dev, dict) and dev.get("host") == host:
                if isinstance(dev.get("gen"), int):
                    gen = dev["gen"]
                break
        return {"host": host, "channel": channel, "gen": gen}

    def _tasmota_meta(self, device_id: str) -> dict[str, Any] | None:
        parts = device_id.split(":")
        if len(parts) < 3:
            return None
        host = parts[1]
        try:
            channel = int(parts[2])
        except ValueError:
            return None
        return {"host": host, "channel": channel}


_engine: AutomationEngine | None = None


def get_engine() -> AutomationEngine:
    global _engine
    if _engine is None:
        _engine = AutomationEngine()
    return _engine
