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
from alykoti_yellow.zwave_mqtt import (
    _load_node_names,
    _slug,
    parse_zwave_device_id,
    set_zwave_device,
    set_zwave_lock,
)

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
MULTI_TARGET_DELAY_SEC = 0.55
SWITCH_STATE_DEBOUNCE_SEC = 0.45
SWITCH_STATE_DEBOUNCE_OFF_SEC = 0.25
MIRROR_ECHO_SUPPRESS_SEC = 8.0
MIRROR_PAIR_BLOCK_SEC = 10.0
MIRROR_COOLDOWN_ON_SEC = 0.15


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
_W100_ACTION_RE = re.compile(
    r"^(single|double|hold|release)_(plus|center|minus)$|^w100_pmtsd_request$",
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


def _parse_w100_action(action: str) -> tuple[str, str] | None:
    """Palauttaa (painike, ele) esim. single_plus → (plus, single)."""
    m = re.match(r"^(single|double|hold|release)_(plus|center|minus)$", action.strip(), re.I)
    if not m:
        return None
    return m.group(2).casefold(), m.group(1).casefold()


def _w100_gesture_matches_press(gesture: str, press: str) -> bool:
    if press == "short":
        return gesture in ("single", "release")
    if press == "long":
        return gesture == "hold"
    if press == "double":
        return gesture == "double"
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
        w100 = _parse_w100_action(action)
        if w100:
            btn, gesture = w100
            if action == ra:
                return True
            if ra == f"{gesture}_{btn}":
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

    w100 = _parse_w100_action(action)
    if w100:
        btn, gesture = w100
        if rb and btn != rb:
            return False
        return _w100_gesture_matches_press(gesture, press)

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
        self._mirror_echo_until: dict[str, float] = {}
        self._mirror_pair_block: dict[str, float] = {}
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
        sensor_keys = ("temperature", "local_temperature", "humidity", "battery")
        is_sensor_only = action is None and any(k in payload for k in sensor_keys)
        for key in (
            "action",
            "button",
            "state",
            "brightness",
            "color",
            "click",
            "temperature",
            "local_temperature",
            "humidity",
            "battery",
        ):
            if key in payload and not (is_sensor_only and key == "state"):
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
                        st = self._light_state.setdefault(device_id, {"on": False, "brightness": 128})
                        st["on"] = bool(meta.get("on"))
                        b = meta.get("brightness")
                        if isinstance(b, (int, float)):
                            st["brightness"] = int(b)
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

            sensor_keys = (
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
            )
            if any(key in payload for key in sensor_keys):
                self._record_device_event(device_key, payload)
                with self._lock:
                    meta = self._home_devices.get(device_key)
                    if isinstance(meta, dict):
                        temp = payload.get("temperature")
                        if temp is None:
                            temp = payload.get("local_temperature")
                        if isinstance(temp, (int, float)):
                            meta["temperature_c"] = float(temp)
                        hum = payload.get("humidity")
                        if isinstance(hum, (int, float)):
                            meta["humidity_pct"] = float(hum)
                        batt = payload.get("battery")
                        if isinstance(batt, (int, float)):
                            meta["battery_pct"] = float(batt)
                        contact = payload.get("contact")
                        if contact is None:
                            contact = payload.get("contact_state")
                        if isinstance(contact, bool):
                            meta["on"] = contact
                            meta["sensor_state"] = "contact"
                        for key, state in (
                            ("water_leak", "water_leak"),
                            ("smoke", "smoke"),
                            ("occupancy", "motion"),
                            ("presence", "motion"),
                        ):
                            if key in payload and isinstance(payload[key], bool):
                                meta["on"] = payload[key]
                                meta["sensor_state"] = state
                                break
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

        device_keys = self._zwave_event_device_keys(node_id, endpoint)

        if cc in (37, 38):
            on = self._zwave_value_to_on(payload.get("value"))
            if on is None:
                return
            device_keys = self._zwave_event_device_keys(node_id, endpoint)
            for device_key in device_keys:
                self._set_light_state(device_key, on)
            for device_key in device_keys:
                self._record_device_event(
                    device_key,
                    {"state": "ON" if on else "OFF", "endpoint": endpoint},
                    action="on" if on else "off",
                    button=str(endpoint),
                )
                self._handle_switch_state(device_key, on, endpoint=endpoint)
            return

        if cc in (48, 113):
            on = self._zwave_value_to_on(payload.get("value"))
            if on is None:
                return
            for action_id in self._zwave_sensor_action_ids(on):
                for device_key in device_keys:
                    self._record_device_event(
                        device_key,
                        {"value": payload.get("value"), "endpoint": endpoint},
                        action=action_id,
                    )
                    self._handle_action(device_key, action_id, None)

    def _zwave_event_device_keys(self, node_id: int, endpoint: int) -> list[str]:
        ep_key = f"zwave:{node_id}:e{endpoint}"
        if endpoint > 0:
            return [ep_key]
        root_key = f"zwave:{node_id}"
        if root_key in self._home_devices:
            return [root_key]
        return [ep_key]

    def _zwave_trigger_matches(
        self,
        trigger_device_id: str,
        node_id: int,
        endpoint: int | None,
    ) -> bool:
        try:
            t_node, t_ep = parse_zwave_device_id(trigger_device_id)
        except ValueError:
            return False
        if t_node != node_id:
            return False
        if t_ep is not None and endpoint is not None and t_ep != endpoint:
            return False
        return True

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

    def _is_mirror_echo(self, device_key: str) -> bool:
        with self._lock:
            return time.monotonic() < self._mirror_echo_until.get(device_key, 0.0)

    def _mark_mirror_echo(self, *device_ids: str) -> None:
        deadline = time.monotonic() + MIRROR_ECHO_SUPPRESS_SEC
        with self._lock:
            for device_id in device_ids:
                self._mirror_echo_until[device_id] = deadline

    def _block_mirror_pair(self, from_key: str, to_key: str) -> None:
        """Estä heti paluupeilaus (B→A) kun A→B juuri ajettiin."""
        deadline = time.monotonic() + MIRROR_PAIR_BLOCK_SEC
        with self._lock:
            self._mirror_pair_block[f"{to_key}->{from_key}"] = deadline

    def _is_mirror_pair_blocked(self, from_key: str, to_key: str) -> bool:
        with self._lock:
            return time.monotonic() < self._mirror_pair_block.get(f"{from_key}->{to_key}", 0.0)

    def _handle_switch_state(
        self,
        device_key: str,
        on: bool,
        *,
        endpoint: int | None,
    ) -> None:
        if self._is_mirror_echo(device_key):
            return
        debounce_key = f"{device_key}:{endpoint if endpoint is not None else 'all'}"
        now = time.monotonic()
        debounce_sec = SWITCH_STATE_DEBOUNCE_OFF_SEC if not on else SWITCH_STATE_DEBOUNCE_SEC
        with self._lock:
            last = self._switch_last_fire.get(debounce_key)
            if last and last[1] == on and (now - last[0]) < debounce_sec:
                return
            self._switch_last_fire[debounce_key] = (now, on)
            rules = list(self._rules)

        matched = False
        node_id: int | None = None
        if device_key.startswith("zwave:"):
            try:
                node_id, _ = parse_zwave_device_id(device_key)
            except ValueError:
                node_id = None

        for rule in rules:
            trigger = rule.get("trigger") if isinstance(rule.get("trigger"), dict) else {}
            trigger_id = trigger.get("device_id")
            if not isinstance(trigger_id, str):
                continue
            if trigger_id != device_key:
                if not (
                    node_id is not None
                    and trigger_id.startswith("zwave:")
                    and self._zwave_trigger_matches(trigger_id, node_id, endpoint)
                ):
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
                for j, expanded_id in enumerate(self._expand_targets(target_id)):
                    if self._is_mirror_pair_blocked(device_key, expanded_id):
                        self._log_event(
                            "skipped",
                            rule_id=rule_id,
                            target_id=expanded_id,
                            message="Peilaus estetty (paluu)",
                        )
                        continue
                    if i > 0 or j > 0:
                        time.sleep(MULTI_TARGET_DELAY_SEC)
                    st = self._get_light_state(expanded_id)
                    mirror_mode = str(act.get("mirror_mode") or "state")
                    if mirror_mode == "toggle_on_press":
                        if not on:
                            self._log_event(
                                "skipped",
                                rule_id=rule_id,
                                target_id=expanded_id,
                                message="Seinäkytkin OFF — ohitetaan (toggle)",
                            )
                            continue
                        target_on = not bool(st.get("on"))
                    else:
                        target_on = on
                        if bool(st.get("on")) == target_on:
                            self._log_event(
                                "skipped",
                                rule_id=rule_id,
                                target_id=expanded_id,
                                message="Jo oikeassa tilassa",
                            )
                            continue
                    if self._command_on_cooldown(expanded_id, "mirror", on=target_on):
                        continue
                    ok = self._apply(
                        expanded_id,
                        target_on,
                        int(st.get("brightness") or 200) if target_on else 0,
                    )
                    if ok:
                        self._mark_mirror_echo(device_key, expanded_id)
                        self._block_mirror_pair(device_key, expanded_id)
                    self._log_event(
                        "ok" if ok else "failed",
                        rule_id=rule_id,
                        rule_name=rule_name,
                        target_id=expanded_id,
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
        node_id: int | None = None
        if device_key.startswith("zwave:"):
            try:
                node_id, _ = parse_zwave_device_id(device_key)
            except ValueError:
                node_id = None

        for rule in rules:
            trigger = rule.get("trigger") if isinstance(rule.get("trigger"), dict) else {}
            trigger_id = trigger.get("device_id")
            if not isinstance(trigger_id, str):
                continue
            if trigger_id != device_key:
                if not (
                    node_id is not None
                    and trigger_id.startswith("zwave:")
                    and self._zwave_trigger_matches(trigger_id, node_id, None)
                ):
                    continue
            if self._trigger_mode(trigger) == "switch_state":
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

    def _command_on_cooldown(self, device_id: str, action_type: str, *, on: bool | None = None) -> bool:
        """Estää Zigbee2MQTT-timeoutit kun komentoja tulee liikaa."""
        if action_type == "mirror" and on is False:
            return False
        now = time.monotonic()
        cooldown = (
            COLOR_COOLDOWN_SEC
            if action_type in ("color_next", "color_prev")
            else MIRROR_COOLDOWN_ON_SEC
            if action_type == "mirror" and on is True
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

    def _resolve_target_id(self, target_id: str) -> str | None:
        """Hyväksy protocol:id ja pelkät Z-Wave node-numerot (myös monikanavaiset)."""
        if ":" in target_id:
            return target_id
        if target_id.isdigit():
            zid = f"zwave:{target_id}"
            if zid in self._home_devices:
                return zid
            if any(k.startswith(f"zwave:{target_id}:e") for k in self._home_devices):
                return zid
        return None

    def _expand_targets(self, target_id: str) -> list[str]:
        """Laajenna zwave:N kaikkiin ohjattaviin endpointeihin jos juuritunnusta ei ole."""
        resolved = self._resolve_target_id(target_id)
        if resolved is None:
            return []
        if not resolved.startswith("zwave:"):
            return [resolved]
        try:
            node_id, ep = parse_zwave_device_id(resolved)
        except ValueError:
            return [resolved]
        if ep is not None or resolved in self._home_devices:
            return [resolved]
        prefix = f"zwave:{node_id}:e"
        endpoints = sorted(
            k
            for k in self._home_devices
            if k.startswith(prefix)
            and isinstance(meta := self._home_devices.get(k), dict)
            and (
                meta.get("controllable")
                or (isinstance(meta.get("mqtt_set_topic"), str) and meta["mqtt_set_topic"].strip())
                or (isinstance(meta.get("lock_set_topic"), str) and meta["lock_set_topic"].strip())
            )
        )
        return endpoints if endpoints else [resolved]

    def _execute_target(self, device_id: str, action_type: str, act: dict[str, Any]) -> bool:
        expanded = self._expand_targets(device_id)
        if not expanded:
            log.warning("Automaatio: virheellinen kohde-ID %r", device_id)
            return False
        if len(expanded) == 1:
            return self._execute_target_one(expanded[0], action_type, act)
        ok_all = True
        for i, device_id in enumerate(expanded):
            if i > 0:
                time.sleep(MULTI_TARGET_DELAY_SEC)
            ok_all = self._execute_target_one(device_id, action_type, act) and ok_all
        return ok_all

    def _execute_target_one(self, device_id: str, action_type: str, act: dict[str, Any]) -> bool:

        st = self._get_light_state(device_id)
        brightness = int(st.get("brightness") or 128)
        on = bool(st.get("on"))

        if action_type == "on":
            pct = act.get("brightness_pct")
            if isinstance(pct, (int, float)) and float(pct) > 0:
                b = max(0, min(254, int(round(float(pct) / 100 * 254))))
                return self._apply(device_id, True, b)
            return self._apply(device_id, True)
        if action_type == "off":
            return self._apply(device_id, False)
        if action_type == "toggle":
            if on:
                return self._apply(device_id, False)
            return self._apply(device_id, True)
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

    def _apply(self, device_id: str, on: bool, brightness: int | None = None) -> bool:
        ok = False
        if device_id.startswith("zigbee:"):
            zigbee_name = device_id.removeprefix("zigbee:")
            if on and brightness is not None and brightness > 0:
                ok = set_light_brightness(config.MQTT_URL, config.MQTT_PREFIX, zigbee_name, brightness, True)
            else:
                ok = set_light(config.MQTT_URL, config.MQTT_PREFIX, zigbee_name, on)
        elif device_id.startswith("zwave:"):
            topic = self._zwave_topic(device_id)
            if topic:
                ok = set_zwave_device(config.MQTT_URL, topic, on)
            else:
                log.warning("Z-Wave ohjaus: ei mqtt_set_topic (%s)", device_id)
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
            self._set_light_state(
                device_id,
                on,
                brightness if on and brightness is not None else int(self._get_light_state(device_id).get("brightness") or 128),
            )
        return ok

    def _zwave_topic(self, device_id: str) -> str | None:
        def topic_from_meta(meta: dict[str, Any] | None) -> str | None:
            if not isinstance(meta, dict):
                return None
            topic = meta.get("mqtt_set_topic")
            if isinstance(topic, str) and topic.strip():
                return topic.strip()
            return None

        direct = topic_from_meta(self._home_devices.get(device_id))
        if direct:
            return direct
        if not device_id.startswith("zwave:"):
            return None
        try:
            node_id, ep = parse_zwave_device_id(device_id)
        except ValueError:
            return None
        if ep is not None:
            ep_key = f"zwave:{node_id}:e{ep}"
            ep_topic = topic_from_meta(self._home_devices.get(ep_key))
            if ep_topic:
                return ep_topic
        root_topic = topic_from_meta(self._home_devices.get(f"zwave:{node_id}"))
        if root_topic:
            return root_topic
        prefix = f"zwave:{node_id}:e"
        for key, meta in self._home_devices.items():
            if key.startswith(prefix) or key == f"zwave:{node_id}":
                topic = topic_from_meta(meta if isinstance(meta, dict) else None)
                if topic:
                    return topic
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

    def _resolve_zwave_id(self, node_id: int, endpoint: int | None = None) -> str:
        preferred = f"zwave:{node_id}:e{endpoint}" if endpoint is not None else f"zwave:{node_id}"
        if preferred in self._home_devices:
            return preferred
        root = f"zwave:{node_id}"
        if root in self._home_devices:
            return root
        prefix = f"zwave:{node_id}:e"
        matches = sorted(k for k in self._home_devices if k.startswith(prefix))
        return matches[0] if matches else preferred

    def _ui_mirror_partners(self, device_id: str) -> list[str]:
        """Sauna/suihku-ryhmän muut laitteet (52↔82↔86 ja 52↔84↔87)."""
        try:
            node_id, endpoint = parse_zwave_device_id(
                device_id if ":" in device_id else f"zwave:{device_id}",
            )
        except ValueError:
            return []
        groups = (
            (52, 1, 82, 1, 86, 1),
            (52, 2, 84, 1, 87, 1),
        )
        for switch_node, switch_ep, takka_node, takka_ep, local_node, local_ep in groups:
            members = (
                (switch_node, switch_ep),
                (takka_node, takka_ep),
                (local_node, local_ep),
            )
            matched = False
            for member_node, member_ep in members:
                if node_id != member_node:
                    continue
                if member_ep is not None and endpoint is not None and endpoint != member_ep:
                    continue
                matched = True
                break
            if not matched:
                continue
            partners: list[str] = []
            for member_node, member_ep in members:
                resolved = self._resolve_zwave_id(member_node, member_ep)
                if resolved == device_id:
                    continue
                try:
                    p_node, p_ep = parse_zwave_device_id(resolved)
                except ValueError:
                    partners.append(resolved)
                    continue
                if p_node == node_id and (p_ep or endpoint) == (endpoint or p_ep):
                    continue
                partners.append(resolved)
            return partners
        return []

    def apply_ui_mirror(self, device_id: str, on: bool) -> None:
        """Peilaa UI-komennon sauna/suihku-ryhmän muihin laitteisiin."""
        if self._is_mirror_echo(device_id):
            return
        for partner in self._ui_mirror_partners(device_id):
            if self._is_mirror_echo(partner):
                continue
            if self._is_mirror_pair_blocked(device_id, partner):
                continue
            st = self._get_light_state(partner)
            if bool(st.get("on")) == on:
                continue
            for target in self._expand_targets(partner):
                if self._command_on_cooldown(target, "mirror", on=on):
                    continue
                ok = self._apply(
                    target,
                    on,
                    int(st.get("brightness") or 200) if on else 0,
                )
                if ok:
                    self._mark_mirror_echo(device_id, target)
                    self._block_mirror_pair(device_id, target)
                    self._log_event(
                        "ok",
                        device_id=device_id,
                        target_id=target,
                        action_type="mirror",
                        message=f"UI-peilaus → {'ON' if on else 'OFF'}",
                    )


_engine: AutomationEngine | None = None


def get_engine() -> AutomationEngine:
    global _engine
    if _engine is None:
        _engine = AutomationEngine()
    return _engine
