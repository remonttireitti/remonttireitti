"""Paikallinen IV-tuuletuslogiikka — sama kuin web ventilation-logic.ts + airfi.ts."""

from __future__ import annotations

import math
import time
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

MIN_FAN_PCT = 25
MAX_FAN_PCT = 100
FAN_RAMP_STEP_PCT = 5
HEAT_BOOST_INDOOR_MIN_C = 25
HEAT_BOOST_OUTDOOR_MIN_C = 20
HEAT_BOOST_PCT = 15

DEFAULT_VENTILATION_CONFIG: dict[str, Any] = {
    "co2_normal_max": 800,
    "co2_elevated_max": 1000,
    "co2_high_max": 1200,
    "humidity_normal_max": 55,
    "humidity_elevated_max": 65,
    "humidity_high_max": 75,
    "pm25_normal_max": 12,
    "pm25_elevated_max": 25,
    "pm25_high_max": 50,
    "speed_normal_pct": 35,
    "speed_elevated_pct": 50,
    "speed_high_pct": 70,
    "speed_max_pct": 90,
    "night_enabled": True,
    "night_start_hour": 22,
    "night_end_hour": 7,
    "night_max_pct": 30,
    "fireplace_supply_pct": 55,
    "fireplace_exhaust_pct": 30,
    "hood_supply_pct": 80,
    "hood_exhaust_pct": 80,
}


def merge_ventilation_config(hub_config: dict[str, Any] | None) -> dict[str, Any]:
    merged = dict(DEFAULT_VENTILATION_CONFIG)
    if isinstance(hub_config, dict):
        for key in DEFAULT_VENTILATION_CONFIG:
            if key in hub_config:
                merged[key] = hub_config[key]
    return merged


def collect_ventilation_humidity(
    home_devices: dict[str, Any] | None,
    *,
    airthings_humidity: float | None = None,
    airfi_humidity: float | None = None,
) -> float | None:
    values: list[float] = []

    def add(v: float | None) -> None:
        if v is not None and math.isfinite(v) and 0 <= v <= 100:
            values.append(float(v))

    add(airthings_humidity)
    add(airfi_humidity)
    if isinstance(home_devices, dict):
        for device in home_devices.values():
            if isinstance(device, dict):
                hum = device.get("humidity_pct")
                if isinstance(hum, (int, float)):
                    add(float(hum))
    if not values:
        return None
    return max(values)


def clamp_fan_pct(value: float) -> int:
    return max(MIN_FAN_PCT, min(MAX_FAN_PCT, round(value)))


def current_hour_helsinki() -> int:
    return datetime.now(ZoneInfo("Europe/Helsinki")).hour


def _is_night_mode(config: dict[str, Any], hour: int | None = None) -> bool:
    if not config.get("night_enabled"):
        return False
    h = current_hour_helsinki() if hour is None else hour
    start = int(config["night_start_hour"])
    end = int(config["night_end_hour"])
    if start == end:
        return False
    if start < end:
        return start <= h < end
    return h >= start or h < end


def _lerp_pct(value: float, low: float, high: float, pct_low: float, pct_high: float) -> float:
    if high <= low:
        return pct_high
    t = (value - low) / (high - low)
    return pct_low + t * (pct_high - pct_low)


def _compute_base_co2_fan_pct(co2: float, config: dict[str, Any]) -> float:
    if co2 <= config["co2_normal_max"]:
        return config["speed_normal_pct"]
    if co2 <= config["co2_elevated_max"]:
        return _lerp_pct(
            co2,
            config["co2_normal_max"],
            config["co2_elevated_max"],
            config["speed_normal_pct"],
            config["speed_elevated_pct"],
        )
    if co2 <= config["co2_high_max"]:
        return _lerp_pct(
            co2,
            config["co2_elevated_max"],
            config["co2_high_max"],
            config["speed_elevated_pct"],
            config["speed_high_pct"],
        )
    over = co2 - config["co2_high_max"]
    extra = min(over / 400, 1) * (config["speed_max_pct"] - config["speed_high_pct"])
    return config["speed_high_pct"] + extra


def _compute_base_humidity_fan_pct(humidity: float, config: dict[str, Any]) -> float:
    if humidity <= config["humidity_normal_max"]:
        return config["speed_normal_pct"]
    if humidity <= config["humidity_elevated_max"]:
        return _lerp_pct(
            humidity,
            config["humidity_normal_max"],
            config["humidity_elevated_max"],
            config["speed_normal_pct"],
            config["speed_elevated_pct"],
        )
    if humidity <= config["humidity_high_max"]:
        return _lerp_pct(
            humidity,
            config["humidity_elevated_max"],
            config["humidity_high_max"],
            config["speed_elevated_pct"],
            config["speed_high_pct"],
        )
    over = humidity - config["humidity_high_max"]
    extra = min(over / 15, 1) * (config["speed_max_pct"] - config["speed_high_pct"])
    return config["speed_high_pct"] + extra


def _compute_base_pm25_fan_pct(pm25: float, config: dict[str, Any]) -> float:
    if pm25 <= config["pm25_normal_max"]:
        return config["speed_normal_pct"]
    if pm25 <= config["pm25_elevated_max"]:
        return _lerp_pct(
            pm25,
            config["pm25_normal_max"],
            config["pm25_elevated_max"],
            config["speed_normal_pct"],
            config["speed_elevated_pct"],
        )
    if pm25 <= config["pm25_high_max"]:
        return _lerp_pct(
            pm25,
            config["pm25_elevated_max"],
            config["pm25_high_max"],
            config["speed_elevated_pct"],
            config["speed_high_pct"],
        )
    over = pm25 - config["pm25_high_max"]
    extra = min(over / 50, 1) * (config["speed_max_pct"] - config["speed_high_pct"])
    return config["speed_high_pct"] + extra


def _is_heat_boost_active(
    inputs: dict[str, float | None],
    config: dict[str, Any],
    hour: int | None = None,
) -> bool:
    if _is_night_mode(config, hour):
        return False
    indoor = inputs.get("indoor_temp_c")
    outdoor = inputs.get("outdoor_temp_c")
    if indoor is None or outdoor is None:
        return False
    return indoor > HEAT_BOOST_INDOOR_MIN_C and outdoor > HEAT_BOOST_OUTDOOR_MIN_C


def compute_auto_fan_pct(
    inputs: dict[str, float | None],
    config: dict[str, Any],
    hour: int | None = None,
) -> int | None:
    candidates: list[float] = []
    co2 = inputs.get("co2")
    if co2 is not None and math.isfinite(co2):
        candidates.append(_compute_base_co2_fan_pct(co2, config))
    humidity = inputs.get("humidity")
    if humidity is not None and math.isfinite(humidity):
        candidates.append(_compute_base_humidity_fan_pct(humidity, config))
    pm25 = inputs.get("pm25")
    if pm25 is not None and math.isfinite(pm25):
        candidates.append(_compute_base_pm25_fan_pct(pm25, config))
    if not candidates:
        return None

    pct = max(candidates)
    if _is_heat_boost_active(inputs, config, hour):
        pct += HEAT_BOOST_PCT
    if _is_night_mode(config, hour):
        pct = min(pct, config["night_max_pct"])
    return clamp_fan_pct(pct)


def smooth_ramp_fan_pct(current: float | None, target: float) -> int:
    if current is None or not math.isfinite(current):
        return clamp_fan_pct(target)
    delta = target - current
    gap = abs(delta)
    if gap <= FAN_RAMP_STEP_PCT:
        return clamp_fan_pct(target)
    step = 15 if gap > 20 else 10 if gap > 10 else FAN_RAMP_STEP_PCT
    return clamp_fan_pct(current + math.copysign(step, delta))


def _parse_iso_ts(value: str) -> float | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return None


def expire_timed_modes(state: dict[str, Any], now: float | None = None) -> dict[str, Any]:
    ts = time.time() if now is None else now
    next_state = dict(state)
    for key in ("fireplace_until", "hood_until"):
        until = next_state.get(key)
        if isinstance(until, str):
            parsed = _parse_iso_ts(until)
            if parsed is not None and parsed <= ts:
                next_state[key] = None
    if not next_state.get("away_unlimited"):
        away_until = next_state.get("away_until")
        if isinstance(away_until, str):
            parsed = _parse_iso_ts(away_until)
            if parsed is not None and parsed <= ts:
                next_state["away_until"] = None
                next_state["away_mode"] = False
    return next_state


def _remaining_ms(until: str | None, now: float) -> float | None:
    if not until:
        return None
    parsed = _parse_iso_ts(until)
    if parsed is None:
        return None
    ms = (parsed - now) * 1000
    return ms if ms > 0 else 0


def effective_control_mode(control_mode: str, state: dict[str, Any], now: float | None = None) -> str:
    ts = time.time() if now is None else now
    s = expire_timed_modes(state, ts)
    if _remaining_ms(s.get("fireplace_until"), ts) is not None:
        return "fireplace"
    if _remaining_ms(s.get("hood_until"), ts) is not None:
        return "hood"
    if control_mode == "manual":
        return "manual"
    return "auto"


def _targets_match(airfi: dict[str, Any], supply: int, exhaust: int) -> bool:
    actual_supply = airfi.get("fan_supply_pct")
    actual_exhaust = airfi.get("fan_exhaust_pct")
    if not isinstance(actual_supply, (int, float)) or not isinstance(actual_exhaust, (int, float)):
        return False
    return (
        abs(actual_supply - supply) < FAN_RAMP_STEP_PCT
        and abs(actual_exhaust - exhaust) < FAN_RAMP_STEP_PCT
    )


def compute_ventilation_targets(
    control_mode: str,
    inputs: dict[str, float | None],
    config: dict[str, Any],
    airfi: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if not airfi or airfi.get("emergency_stop") or airfi.get("away_mode"):
        return None
    if airfi.get("machine_fault") or airfi.get("freezing_alarm"):
        return None

    supply: float
    exhaust: float
    fireplace = False

    if control_mode == "hood":
        supply = config["hood_supply_pct"]
        exhaust = config["hood_exhaust_pct"]
    elif control_mode == "fireplace":
        supply = config["fireplace_supply_pct"]
        exhaust = config["fireplace_exhaust_pct"]
        fireplace = True
    elif control_mode == "manual":
        return None
    else:
        fan_inputs = dict(inputs)
        if fan_inputs.get("outdoor_temp_c") is None:
            outdoor = airfi.get("outdoor_temp_c")
            if isinstance(outdoor, (int, float)):
                fan_inputs["outdoor_temp_c"] = float(outdoor)
        pct = compute_auto_fan_pct(fan_inputs, config)
        if pct is None:
            return None
        supply = pct
        exhaust = pct

    display_supply = clamp_fan_pct(supply)
    display_exhaust = clamp_fan_pct(exhaust)
    fan_supply = airfi.get("fan_supply_pct")
    fan_exhaust = airfi.get("fan_exhaust_pct")
    write_supply = smooth_ramp_fan_pct(
        float(fan_supply) if isinstance(fan_supply, (int, float)) else None,
        display_supply,
    )
    write_exhaust = smooth_ramp_fan_pct(
        float(fan_exhaust) if isinstance(fan_exhaust, (int, float)) else None,
        display_exhaust,
    )

    needs_write = (
        not _targets_match(airfi, write_supply, write_exhaust)
        or bool(airfi.get("fireplace_active")) != fireplace
        or (
            isinstance(fan_supply, (int, float))
            and abs(fan_supply - display_supply) > FAN_RAMP_STEP_PCT
        )
        or (
            isinstance(fan_exhaust, (int, float))
            and abs(fan_exhaust - display_exhaust) > FAN_RAMP_STEP_PCT
        )
    )

    return {
        "supply": write_supply,
        "exhaust": write_exhaust,
        "fireplace": fireplace,
        "display_supply": display_supply,
        "display_exhaust": display_exhaust,
        "needs_write": needs_write,
    }


parse_ventilation_config = merge_ventilation_config


def collect_ventilation_humidity_pct(
    home_devices: dict[str, Any] | None,
    *,
    airthings_humidity: float | None = None,
    airfi_humidity: float | None = None,
) -> float | None:
    return collect_ventilation_humidity(
        home_devices,
        airthings_humidity=airthings_humidity,
        airfi_humidity=airfi_humidity,
    )
