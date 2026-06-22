"""Zigbee2MQTT-painikkeet → valosäännöt (paikallinen suoritus)."""

from __future__ import annotations

import json
import logging
import re
import threading
import time
from collections import deque
from datetime import datetime, timezone
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
from alykoti_yellow.zwave_mqtt import _load_node_names, _slug, set_zwave_device, set_zwave_lock

log = logging.getLogger(__name__)

ZWAVE_CV_RE = re.compile(r"^zwave/([^/]+)/([^/]+)/(\d+)/(\d+)/currentValue$")
ZWAVE_CV_NODE_RE = re.compile(r"^zwave/nodeID_(\d+)/(\d+)/(\d+)/currentValue$")

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
HOLD_RELEASE = frozenset(
    {
        "hold_release",
        "hold_released",
        "press_release",
    }
)
HUE_BUTTONS = frozenset({"on", "off", "up", "down"})
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
COMMAND_COOLDOWN_SEC = 0.5
COLOR_COOLDOWN_SEC = 0.9
MULTI_TARGET_DELAY_SEC = 0.2
SWITCH_STATE_DEBOUNCE_SEC = 0.45


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


_HUE_ACTION_RE = re.compile(
    r"^(on|off|up|down)_(press|hold|press_release|hold_release|hold_released)$",
    re.I,
)


def _parse_hue_action(action: str) -> tuple[str, str] | None:
    normalized = action.strip().casefold().replace("-", "_")
    m = _HUE_ACTION_RE.match(normalized)
    if not m:
        return None
    gesture = m.group(2).casefold()
    if gesture == "hold_released":
        gesture = "hold_release"
    return m.group(1).casefold(), gesture


def _match_button(
    incoming_button: str | None,
    rule_button: str | None,
    *,
    incoming_action: str | None = None,
) -> bool:
    if not rule_button:
        return True
    rb = rule_button.strip().casefold()
    if incoming_button and incoming_button.strip().casefold() == rb:
        return True
    if incoming_action:
        parsed = _parse_hue_action(incoming_action)
        if parsed and parsed[0] == rb:
            return True
    return False


def _button_index(button: str | None) -> str | None:
    if not button:
        return None
    m = re.match(r"button_(\d+)", button.strip(), re.I)
    return m.group(1) if m else None


def _hue_gesture_matches_press(gesture: str, press: str) -> bool:
    if press == "short":
        return gesture in ("press", "press_release")
    if press == "long":
        return gesture == "hold"
    if press == "double":
        return False
    return False


def _match_rule_action(
    incoming: str,
    button: str | None,
    press: str,
    rule_action: str | None,
    rule_button: str | None = None,
) -> bool:
    """Täsmää action ja painallustyyppi — tukee Hue on_press, 2_click, button_2 + click jne."""
    action = incoming.strip().casefold()
    if not action:
        return False

    hue = _parse_hue_action(action)
    rb = rule_button.strip().casefold() if rule_button and rule_button.strip() else None

    if rule_action and str(rule_action).strip():
        ra = str(rule_action).strip().casefold()
        if action == ra:
            return True
        if hue:
            btn, gesture = hue
            if ra == f"{btn}_{gesture}":
                return True
            if rb and btn == rb and ra == gesture:
                return True
            if not rb and ra == gesture:
                return True
        idx = _button_index(button)
        if idx and action == f"{idx}_{ra}":
            return True
        if hue and ra in ("press", "hold", "press_release", "hold_release"):
            if hue[1] == ra and (not rb or hue[0] == rb):
                return True
        if not hue and action.endswith(f"_{ra}"):
            return True
        return False

    if hue:
        btn, gesture = hue
        if rb and btn != rb:
            return False
        return _hue_gesture_matches_press(gesture, press)

    return _match_action(action, press)


class AutomationEngine:
    """Kuuntelee Zigbee2MQTT action-viestejä ja suorittaa säännöt."""

    def __init__(self) -> None:
        self._rules: list[dict[str, Any]] = []
        self._integrations: dict[str, Any] = {}
        self._home_devices: dict[str, Any] = {}
        self._light_state: dict[str, dict[str, Any]] = {}
        self._color_index: dict[str, int] = {}
        self._command_cooldown: dict[str, float] = {}
        self._zwave_path_to_node: dict[str, int] = {}
        self._switch_last_fire: dict[str, tuple[float, bool]] = {}
        self._lock = threading.Lock()
        self._events: deque[dict[str, Any]] = deque(maxlen=60)
        self._device_events: dict[str, deque[dict[str, Any]]] = {}
        self._client: mqtt.Client | None = None
        self._thread: threading.Thread | None = None

    def _log_event(self, stage: str, **fields: Any) -> None:
        entry: dict[str, Any] = {
            "at": datetime.now(timezone.utc).isoformat(),
            "stage": stage,
            **{k: v for k, v in fields.items() if v is not None},
        }
        with self._lock:
            self._events.appendleft(entry)

    def get_events(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._events)

    def _record_device_event(
        self,
        device_key: str,
        payload: dict[str, Any],
        *,
        action: str | None = None,
        button: str | None = None,
    ) -> None:
        raw: dict[str, Any] = {}
        for key in ("action", "button", "state", "brightness", "color", "click"):
            if key in payload:
                raw[key] = payload[key]
        entry = {
            "at": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "button": button,
            "raw": raw,
        }
        with self._lock:
            if device_key not in self._device_events:
                self._device_events[device_key] = deque(maxlen=40)
            self._device_events[device_key].appendleft(entry)

    def get_device_events(self) -> dict[str, list[dict[str, Any]]]:
        with self._lock:
            return {k: list(v) for k, v in self._device_events.items()}

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
            self._rebuild_zwave_paths()
        log.info("Automaatiot päivitetty: %s aktiivista sääntöä", len(enabled))

    def _rebuild_zwave_paths(self) -> None:
        meta = _load_node_names(config.ZWAVE_NODES_JSON)
        paths: dict[str, int] = {}
        for node_id, info in meta.items():
            paths[f"nodeID_{node_id}"] = node_id
            loc = info.get("loc") or ""
            name = info.get("name") or ""
            if loc and name:
                paths[f"{loc}/{_slug(name)}"] = node_id
        self._zwave_path_to_node = paths

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
            client.subscribe(f"{config.ZWAVE_PREFIX}/#")
            log.info("Automaatio MQTT kuuntelee %s/# ja %s/#", prefix, config.ZWAVE_PREFIX)

        def on_message(_client, _userdata, msg):
            topic = msg.topic
            if topic.startswith(f"{config.ZWAVE_PREFIX}/"):
                try:
                    payload = json.loads(msg.payload.decode())
                except (json.JSONDecodeError, UnicodeDecodeError):
                    return
                if isinstance(payload, dict):
                    self._handle_zwave_message(topic, payload)
                return

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
                self._record_device_event(
                    device_key,
                    payload,
                    action=action,
                    button=button_str,
                )
                self._handle_action(device_key, action, button_str)
                return

            if "state" in payload or "brightness" in payload:
                self._record_device_event(device_key, payload)
                on: bool | None = None
                with self._lock:
                    st = self._light_state.setdefault(device_key, {"on": False, "brightness": 128})
                    if "state" in payload:
                        on = payload.get("state") == "ON"
                        st["on"] = on
                    if "brightness" in payload and isinstance(payload["brightness"], (int, float)):
                        st["brightness"] = int(payload["brightness"])
                if on is not None:
                    self._handle_switch_state(device_key, on, endpoint=None)

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
                time.sleep(5)

    def _zwave_value_to_on(self, value: Any) -> bool | None:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value > 0
        return None

    def _handle_zwave_message(self, topic: str, payload: dict[str, Any]) -> None:
        m = ZWAVE_CV_RE.match(topic)
        node_id: int | None = None
        cc = 0
        endpoint = 0
        if m:
            path = f"{m.group(1)}/{m.group(2)}"
            cc = int(m.group(3))
            endpoint = int(m.group(4))
            node_id = self._zwave_path_to_node.get(path)
        else:
            m2 = ZWAVE_CV_NODE_RE.match(topic)
            if not m2:
                return
            node_id = int(m2.group(1))
            cc = int(m2.group(2))
            endpoint = int(m2.group(3))

        if node_id is None:
            return

        device_key = f"zwave:{node_id}"

        if cc in (37, 38):
            on = self._zwave_value_to_on(payload.get("value"))
            if on is None:
                return
            for action_id in self._zwave_switch_action_ids(endpoint, on):
                self._record_device_event(
                    device_key,
                    {"state": "ON" if on else "OFF", "endpoint": endpoint},
                    action=action_id,
                    button=str(endpoint),
                )
                self._handle_switch_state(device_key, on, endpoint=endpoint)
                self._handle_action(device_key, action_id, str(endpoint))
            return

        if cc in (48, 113):
            on = self._zwave_value_to_on(payload.get("value"))
            if on is None:
                return
            for action_id in self._zwave_sensor_action_ids(on):
                self._record_device_event(
                    device_key,
                    {"value": payload.get("value"), "endpoint": endpoint},
                    action=action_id,
                )
                self._handle_action(device_key, action_id, None)

    def _zwave_switch_action_ids(self, endpoint: int, on: bool) -> list[str]:
        state = "on" if on else "off"
        return [state, f"ep{endpoint}_{state}"]

    def _zwave_sensor_action_ids(self, on: bool) -> list[str]:
        if on:
            return ["value_true", "open", "motion"]
        return ["value_false", "closed", "no_motion"]

    def _trigger_mode(self, trigger: dict[str, Any]) -> str:
        mode = trigger.get("mode")
        if isinstance(mode, str) and mode.strip():
            return mode.strip()
        return "action"

    def _trigger_endpoint(self, trigger: dict[str, Any]) -> int | None:
        ep = trigger.get("endpoint")
        if isinstance(ep, int):
            return ep
        if isinstance(ep, float):
            return int(ep)
        return None

    def _handle_switch_state(
        self,
        device_key: str,
        on: bool,
        *,
        endpoint: int | None,
    ) -> None:
        debounce_key = f"{device_key}:{endpoint if endpoint is not None else 'all'}"
        now = time.monotonic()
        with self._lock:
            last = self._switch_last_fire.get(debounce_key)
            if last and last[1] == on and (now - last[0]) < SWITCH_STATE_DEBOUNCE_SEC:
                return
            self._switch_last_fire[debounce_key] = (now, on)
            rules = list(self._rules)

        matched = False
        for rule in rules:
            trigger = rule.get("trigger") if isinstance(rule.get("trigger"), dict) else {}
            if trigger.get("device_id") != device_key:
                continue
            if self._trigger_mode(trigger) != "switch_state":
                continue
            rule_ep = self._trigger_endpoint(trigger)
            if rule_ep is not None and endpoint is not None and rule_ep != endpoint:
                continue
            act = rule.get("action") if isinstance(rule.get("action"), dict) else {}
            if str(act.get("type", "")) != "mirror":
                continue
            targets = act.get("target_ids")
            if not isinstance(targets, list):
                continue

            rule_id = str(rule.get("id", "")) or None
            rule_name = str(rule.get("name", "")) or None
            matched = True
            self._log_event(
                "triggered",
                rule_id=rule_id,
                rule_name=rule_name,
                device_id=device_key,
                action_type="mirror",
                message=f"{'ON' if on else 'OFF'} → {len(targets)} kohdetta",
            )
            for i, target_id in enumerate(targets):
                if not isinstance(target_id, str) or target_id == device_key:
                    continue
                if i > 0:
                    time.sleep(MULTI_TARGET_DELAY_SEC)
                st = self._get_light_state(target_id)
                if bool(st.get("on")) == on:
                    self._log_event(
                        "skipped",
                        rule_id=rule_id,
                        target_id=target_id,
                        message="Jo oikeassa tilassa",
                    )
                    continue
                if self._command_on_cooldown(target_id, "mirror"):
                    continue
                ok = self._apply(
                    target_id,
                    on,
                    int(st.get("brightness") or 200) if on else 0,
                )
                self._log_event(
                    "ok" if ok else "failed",
                    rule_id=rule_id,
                    rule_name=rule_name,
                    target_id=target_id,
                    action_type="mirror",
                    message="OK" if ok else "Ohjaus epäonnistui",
                )

        if not matched:
            with self._lock:
                has_rules = any(
                    isinstance(r.get("trigger"), dict)
                    and r["trigger"].get("device_id") == device_key
                    and self._trigger_mode(r["trigger"]) == "switch_state"
                    for r in rules
                )
            if has_rules:
                self._log_event(
                    "no_match",
                    device_id=device_key,
                    message=f"Kytkintila ep={endpoint} — ei täsmäävää kanavaa",
                )

    def _handle_action(self, device_key: str, action: str, button: str | None) -> None:
        with self._lock:
            rules = list(self._rules)
        device_rules = [
            r
            for r in rules
            if isinstance(r.get("trigger"), dict)
            and r["trigger"].get("device_id") == device_key
        ]
        if device_rules:
            self._log_event(
                "mqtt",
                device_id=device_key,
                mqtt_action=action,
                mqtt_button=button,
                message="Painike / action vastaanotettu",
            )

        matched_any = False
        for rule in rules:
            trigger = rule.get("trigger") if isinstance(rule.get("trigger"), dict) else {}
            if trigger.get("device_id") != device_key:
                continue
            press = str(trigger.get("press", "short"))
            rule_button = trigger.get("button")
            rule_button_str = str(rule_button) if isinstance(rule_button, str) and rule_button.strip() else None
            rule_action = trigger.get("action")
            rule_action_str = str(rule_action) if isinstance(rule_action, str) and rule_action.strip() else None
            if not _match_rule_action(
                action,
                button,
                press,
                rule_action_str,
                rule_button_str,
            ):
                continue
            if not _match_button(
                button,
                rule_button_str,
                incoming_action=action,
            ):
                continue
            act = rule.get("action") if isinstance(rule.get("action"), dict) else {}
            targets = act.get("target_ids")
            if not isinstance(targets, list):
                continue
            action_type = str(act.get("type", ""))
            rule_id = str(rule.get("id", "")) or None
            rule_name = str(rule.get("name", "")) or None
            matched_any = True
            self._log_event(
                "triggered",
                rule_id=rule_id,
                rule_name=rule_name,
                device_id=device_key,
                mqtt_action=action,
                mqtt_button=button,
                action_type=action_type,
                message=f"{len(targets)} kohdetta",
            )
            log.info(
                "Automaatio: %s action=%s → %s (%s kohdetta)",
                device_key,
                action,
                action_type,
                len(targets),
            )
            for i, target_id in enumerate(targets):
                if isinstance(target_id, str):
                    if i > 0:
                        time.sleep(MULTI_TARGET_DELAY_SEC)
                    if self._command_on_cooldown(target_id, action_type):
                        self._log_event(
                            "skipped",
                            rule_id=rule_id,
                            rule_name=rule_name,
                            target_id=target_id,
                            action_type=action_type,
                            message="Ohitettu — liian monta komentoa peräkkäin",
                        )
                        continue
                    self._log_event(
                        "command_sent",
                        rule_id=rule_id,
                        rule_name=rule_name,
                        target_id=target_id,
                        action_type=action_type,
                        message="Lähetetään MQTT/HTTP",
                    )
                    ok = self._execute_target(target_id, action_type, act)
                    self._log_event(
                        "ok" if ok else "failed",
                        rule_id=rule_id,
                        rule_name=rule_name,
                        target_id=target_id,
                        action_type=action_type,
                        message="OK" if ok else "Ohjaus epäonnistui",
                    )

        if device_rules and not matched_any:
            self._log_event(
                "no_match",
                device_id=device_key,
                mqtt_action=action,
                mqtt_button=button,
                message="Ei täsmäävää sääntöä — tarkista action ja painike",
            )

    def _get_light_state(self, device_id: str) -> dict[str, Any]:
        with self._lock:
            return dict(self._light_state.get(device_id, {"on": False, "brightness": 128}))

    def _command_on_cooldown(self, device_id: str, action_type: str) -> bool:
        """Estää Zigbee2MQTT-timeoutit kun komentoja tulee liikaa."""
        now = time.monotonic()
        cooldown = (
            COLOR_COOLDOWN_SEC
            if action_type in ("color_next", "color_prev")
            else COMMAND_COOLDOWN_SEC
        )
        key = f"{device_id}:{action_type}"
        with self._lock:
            last = self._command_cooldown.get(key, 0.0)
            if now - last < cooldown:
                return True
            self._command_cooldown[key] = now
        return False

    def _set_light_state(self, device_id: str, on: bool, brightness: int | None = None) -> None:
        with self._lock:
            st = self._light_state.setdefault(device_id, {"on": False, "brightness": 128})
            st["on"] = on
            if brightness is not None:
                st["brightness"] = brightness

    def _execute_target(self, device_id: str, action_type: str, act: dict[str, Any]) -> bool:
        st = self._get_light_state(device_id)
        brightness = int(st.get("brightness") or 128)
        on = bool(st.get("on"))

        if action_type == "on":
            return self._apply(device_id, True, brightness if brightness > 0 else 200)
        if action_type == "off":
            return self._apply(device_id, False, brightness)
        if action_type == "toggle":
            return self._apply(device_id, not on, brightness if not on else max(brightness, 40))
        if action_type == "brightness_up":
            return self._apply(device_id, True, min(254, brightness + BRIGHTNESS_STEP))
        if action_type == "brightness_down":
            new_b = max(0, brightness - BRIGHTNESS_STEP)
            return self._apply(device_id, new_b > 0, new_b)
        if action_type == "set_brightness":
            pct = act.get("brightness_pct")
            if isinstance(pct, (int, float)):
                b = max(0, min(254, int(round(float(pct) / 100 * 254))))
                return self._apply(device_id, b > 0, b)
            return False
        if action_type in ("color_next", "color_prev"):
            if not device_id.startswith("zigbee:"):
                log.debug("Värin vaihto vain Zigbee-valoille: %s", device_id)
                return False
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
            return ok

        if action_type in ("lock", "unlock", "toggle_lock"):
            locked = action_type == "lock"
            if action_type == "toggle_lock":
                meta = self._home_devices.get(device_id)
                locked = not bool(isinstance(meta, dict) and meta.get("locked"))
            return self._apply_lock(device_id, locked)

        log.warning("Tuntematon automaatiotoiminto: %s", action_type)
        return False

    def _apply_lock(self, device_id: str, locked: bool) -> bool:
        topic = self._lock_topic(device_id)
        if not topic:
            log.warning("Lukon ohjaus: ei lock_set_topic (%s)", device_id)
            return False
        ok = set_zwave_lock(config.MQTT_URL, topic, locked)
        if ok:
            with self._lock:
                st = self._light_state.setdefault(device_id, {"on": False, "brightness": 128})
                st["on"] = locked
            meta = self._home_devices.get(device_id)
            if isinstance(meta, dict):
                meta["locked"] = locked
                meta["on"] = locked
        return ok

    def _apply(self, device_id: str, on: bool, brightness: int) -> bool:
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
        return ok

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
