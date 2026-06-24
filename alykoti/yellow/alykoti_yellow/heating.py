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


def _parse_iso_ts(value: str) -> float | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return None


def _temperature_from_device_meta(meta: dict[str, Any]) -> float | None:
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
        return float(value)
    return None


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


def _read_temperature(home_devices: dict[str, Any], sensor_id: str) -> float | None:
    meta = home_devices.get(sensor_id)
    if isinstance(meta, dict):
        temp = _temperature_from_device_meta(meta)
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
        temp = _temperature_from_device_meta(candidate)
        if temp is not None:
            return temp
    return None


def _read_actuator_on(home_devices: dict[str, Any], actuator_id: str) -> bool | None:
    meta = home_devices.get(actuator_id)
    if not isinstance(meta, dict):
        return None
    return bool(meta.get("on"))


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

    for zone in thermostats:
        if not isinstance(zone, dict):
            continue
        if zone.get("enabled") is False:
            continue

        zone_id = zone.get("id")
        sensor_id = zone.get("sensor_device_id")
        actuator_id = zone.get("actuator_device_id")
        target = zone.get("target_temp_c")
        if not isinstance(zone_id, str) or not zone_id:
            continue
        if not isinstance(sensor_id, str) or not isinstance(actuator_id, str):
            continue
        if not isinstance(target, (int, float)):
            continue

        temp = _read_temperature(home_devices, sensor_id)
        if temp is None:
            continue

        current_on = _read_actuator_on(home_devices, actuator_id)
        if current_on is None:
            continue

        hysteresis = zone.get("hysteresis_c", DEFAULT_HYSTERESIS_C)
        hysteresis = float(hysteresis) if isinstance(hysteresis, (int, float)) else DEFAULT_HYSTERESIS_C
        min_on = zone.get("min_on_sec", DEFAULT_MIN_ON_SEC)
        min_off = zone.get("min_off_sec", DEFAULT_MIN_OFF_SEC)
        min_on = int(min_on) if isinstance(min_on, (int, float)) else DEFAULT_MIN_ON_SEC
        min_off = int(min_off) if isinstance(min_off, (int, float)) else DEFAULT_MIN_OFF_SEC

        half = hysteresis / 2.0
        on_threshold = float(target) - half
        off_threshold = float(target) + half

        if temp < on_threshold:
            desired_on = True
        elif temp > off_threshold:
            desired_on = False
        else:
            desired_on = current_on

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

        ok = engine.control_device(actuator_id, desired_on)
        if ok:
            runtime[zone_id] = {
                "last_change_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "on": desired_on,
            }
            log.info(
                "Lämmitystermostaatti %s: %.1f°C → %s (tavoite %.1f°C)",
                zone.get("name") or zone_id,
                temp,
                "päälle" if desired_on else "pois",
                float(target),
            )
