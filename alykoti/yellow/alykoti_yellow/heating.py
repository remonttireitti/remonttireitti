"""Lämmitystermostaattien automaattiohjaus Yellow-synkissä."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from alykoti_yellow.automations import get_engine

log = logging.getLogger(__name__)

DEFAULT_HYSTERESIS_C = 0.5
DEFAULT_MIN_ON_SEC = 120
DEFAULT_MIN_OFF_SEC = 120
DEFAULT_PUMP_START_DELAY_SEC = 60


def _parse_iso_ts(value: str) -> float | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return None


def _temperature_from_device_meta(meta: dict[str, Any], reading_label: str | None = None) -> float | None:
    if reading_label:
        item_names = meta.get("item_names")
        if isinstance(item_names, dict):
            for key, name in item_names.items():
                if not isinstance(name, str):
                    continue
                if name.strip().casefold() != reading_label.strip().casefold():
                    continue
                if key.startswith("p:49:"):
                    for prop in meta.get("zwave_properties") or []:
                        if not isinstance(prop, dict):
                            continue
                        if prop.get("cc") != 49:
                            continue
                        prop_key = f"p:49:{prop.get('property')}:"
                        if not str(key).startswith(prop_key):
                            continue
                        value = prop.get("value")
                        if isinstance(value, (int, float)):
                            return float(value)

    temp = meta.get("temperature_c")
    if isinstance(temp, (int, float)) and float(temp) == float(temp):
        return float(temp)
    for prop in meta.get("zwave_properties") or []:
        if not isinstance(prop, dict):
            continue
        if prop.get("cc") != 49:
            continue
        name = str(prop.get("property") or "").casefold()
        value = prop.get("value")
        if not isinstance(value, (int, float)):
            continue
        if "voltage" in name:
            continue
        if "humidity" in name or "luminance" in name or "co2" in name:
            continue
        if reading_label:
            prop_label = str(prop.get("property") or "")
            item_names = meta.get("item_names")
            if isinstance(item_names, dict):
                prop_key = f"p:49:{prop.get('property')}:"
                for key, custom in item_names.items():
                    if isinstance(custom, str) and str(key).startswith(prop_key):
                        prop_label = custom
                        break
            if prop_label.strip().casefold() != reading_label.strip().casefold():
                continue
        return float(value)
    return None


def _parse_actuator_ids(zone: dict[str, Any]) -> list[str]:
    raw_ids = zone.get("actuator_device_ids")
    if isinstance(raw_ids, list):
        return [aid for aid in raw_ids if isinstance(aid, str) and aid]
    legacy = zone.get("actuator_device_id")
    if isinstance(legacy, str) and legacy:
        return [legacy]
    return []


def _zwave_node_id(sensor_id: str) -> int | None:
    if not sensor_id.startswith("zwave:"):
        return None
    parts = sensor_id.split(":")
    if len(parts) < 2:
        return None
    try:
        return int(parts[1])
    except (TypeError, ValueError):
        return None


def _read_temperature(
    home_devices: dict[str, Any],
    sensor_id: str,
    reading_label: str | None = None,
) -> float | None:
    meta = home_devices.get(sensor_id)
    if isinstance(meta, dict):
        temp = _temperature_from_device_meta(meta, reading_label)
        if temp is not None:
            return temp

    node_id = _zwave_node_id(sensor_id)
    if node_id is None:
        return None

    prefix = f"zwave:{node_id}"
    for device_id, candidate in home_devices.items():
        if not isinstance(candidate, dict):
            continue
        if device_id == sensor_id:
            continue
        if device_id != prefix and not device_id.startswith(f"{prefix}:e"):
            continue
        temp = _temperature_from_device_meta(candidate, reading_label)
        if temp is not None:
            return temp
    return None


def _read_actuator_on(home_devices: dict[str, Any], actuator_id: str) -> bool | None:
    meta = home_devices.get(actuator_id)
    if not isinstance(meta, dict):
        return None
    return bool(meta.get("on"))


def _desired_heat_on(
    temp: float,
    target: float,
    hysteresis: float,
    current_on: bool,
) -> bool:
    half = hysteresis / 2.0
    on_threshold = target - half
    off_threshold = target + half
    if temp < on_threshold:
        return True
    if temp > off_threshold:
        return False
    return current_on


def _apply_heating_pump(
    config: dict[str, Any],
    home_devices: dict[str, Any],
    hub_state: dict,
    zone_demands: dict[str, bool],
    now: float,
) -> None:
    pump_cfg = config.get("heating_pump")
    if not isinstance(pump_cfg, dict):
        return
    if pump_cfg.get("enabled") is False:
        return

    actuator_id = pump_cfg.get("actuator_device_id")
    if not isinstance(actuator_id, str) or not actuator_id:
        return

    start_delay = pump_cfg.get("start_delay_sec", DEFAULT_PUMP_START_DELAY_SEC)
    start_delay = (
        int(start_delay) if isinstance(start_delay, (int, float)) else DEFAULT_PUMP_START_DELAY_SEC
    )
    start_delay = max(0, start_delay)

    current_on = _read_actuator_on(home_devices, actuator_id)
    if current_on is None:
        return

    any_calling = any(zone_demands.values())

    pump_runtime_raw = hub_state.get("heating_pump_runtime")
    pump_runtime: dict[str, Any] = pump_runtime_raw if isinstance(pump_runtime_raw, dict) else {}
    hub_state["heating_pump_runtime"] = pump_runtime

    if any_calling:
        first_demand_at = pump_runtime.get("first_demand_at")
        if not isinstance(first_demand_at, str):
            pump_runtime["first_demand_at"] = datetime.now(timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )
            first_demand_at = pump_runtime["first_demand_at"]

        first_ts = _parse_iso_ts(first_demand_at)
        elapsed = (now - first_ts) if first_ts is not None else 0.0
        desired_on = elapsed >= start_delay
    else:
        pump_runtime.pop("first_demand_at", None)
        desired_on = False

    if desired_on == current_on:
        return

    engine = get_engine()
    ok = engine.control_device(actuator_id, desired_on)
    if ok:
        pump_runtime["last_change_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        pump_runtime["on"] = desired_on
        log.info(
            "Lattialämmityspumppu: %s (%d termostaattia pyytää lämpöä)",
            "päälle" if desired_on else "pois",
            sum(1 for calling in zone_demands.values() if calling),
        )


def apply_heating_thermostats(response: dict, hub_state: dict) -> None:
    """Säätää lämmitystoimilaiset termostaattisääntöjen mukaan."""
    config = response.get("config")
    if not isinstance(config, dict):
        return

    thermostats = config.get("heating_thermostats")
    if not isinstance(thermostats, list) or not thermostats:
        return

    home_devices = hub_state.get("home_devices")
    if not isinstance(home_devices, dict):
        return

    runtime_raw = hub_state.get("heating_runtime")
    runtime: dict[str, dict[str, Any]] = runtime_raw if isinstance(runtime_raw, dict) else {}
    hub_state["heating_runtime"] = runtime

    engine = get_engine()
    now = time.time()
    zone_demands: dict[str, bool] = {}

    for zone in thermostats:
        if not isinstance(zone, dict):
            continue
        if zone.get("enabled") is False:
            continue

        zone_id = zone.get("id")
        sensor_id = zone.get("sensor_device_id")
        actuator_ids = _parse_actuator_ids(zone)
        reading_label = zone.get("sensor_reading_label")
        if isinstance(reading_label, str):
            reading_label = reading_label.strip() or None
        else:
            reading_label = None
        target = zone.get("target_temp_c")
        if not isinstance(zone_id, str) or not zone_id:
            continue
        if not isinstance(sensor_id, str) or not actuator_ids:
            continue
        if not isinstance(target, (int, float)):
            continue

        temp = _read_temperature(home_devices, sensor_id, reading_label)
        if temp is None:
            continue

        actuator_states: list[bool] = []
        for actuator_id in actuator_ids:
            state = _read_actuator_on(home_devices, actuator_id)
            if state is not None:
                actuator_states.append(state)
        if not actuator_states:
            continue
        current_on = any(actuator_states)

        hysteresis = zone.get("hysteresis_c", DEFAULT_HYSTERESIS_C)
        hysteresis = float(hysteresis) if isinstance(hysteresis, (int, float)) else DEFAULT_HYSTERESIS_C
        min_on = zone.get("min_on_sec", DEFAULT_MIN_ON_SEC)
        min_off = zone.get("min_off_sec", DEFAULT_MIN_OFF_SEC)
        min_on = int(min_on) if isinstance(min_on, (int, float)) else DEFAULT_MIN_ON_SEC
        min_off = int(min_off) if isinstance(min_off, (int, float)) else DEFAULT_MIN_OFF_SEC

        desired_on = _desired_heat_on(float(temp), float(target), hysteresis, current_on)
        zone_demands[zone_id] = desired_on

        if desired_on == current_on:
            continue

        zone_runtime = runtime.get(zone_id)
        last_change_at = zone_runtime.get("last_change_at") if isinstance(zone_runtime, dict) else None
        last_on = bool(zone_runtime.get("on")) if isinstance(zone_runtime, dict) else current_on

        elapsed = 999999.0
        if isinstance(last_change_at, str):
            last_ts = _parse_iso_ts(last_change_at)
            if last_ts is not None:
                elapsed = now - last_ts

        if desired_on and not current_on and not last_on and elapsed < min_off:
            continue
        if not desired_on and current_on and last_on and elapsed < min_on:
            continue

        changed = False
        for actuator_id in actuator_ids:
            act_on = _read_actuator_on(home_devices, actuator_id)
            if act_on is None or act_on == desired_on:
                continue
            ok = engine.control_device(actuator_id, desired_on)
            if ok:
                changed = True

        if changed:
            runtime[zone_id] = {
                "last_change_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "on": desired_on,
            }
            log.info(
                "Lämmitystermostaatti %s: %.1f°C → %s (%d toimilaitetta, tavoite %.1f°C)",
                zone.get("name") or zone_id,
                temp,
                "päälle" if desired_on else "pois",
                len(actuator_ids),
                float(target),
            )

    _apply_heating_pump(config, home_devices, hub_state, zone_demands, now)
