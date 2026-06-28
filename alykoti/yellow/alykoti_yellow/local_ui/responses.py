"""JSON-vastaukset paikalliselle API:lle — sama muoto kuin alykoti/web API."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import unquote

from alykoti_yellow import config
from alykoti_yellow.local_ui import context
from alykoti_yellow.ventilation_local import effective_control_mode


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _hub_info() -> dict[str, Any]:
    info = context.hub_info()
    return info if isinstance(info, dict) else {}


def _snapshot_state() -> dict[str, Any]:
    live = context.snapshot_state()
    info = _hub_info()
    cached = info.get("cached_state")
    if isinstance(cached, dict):
        state = {**cached, **live}
    else:
        state = dict(live)
    integrations = info.get("integrations")
    if isinstance(integrations, dict):
        state["integrations"] = integrations
    automations = info.get("automations")
    if isinstance(automations, list) and automations and "automations" not in state:
        state["automations"] = automations
    return state


def _device_rows(state: dict[str, Any]) -> list[dict[str, Any]]:
    home = state.get("home_devices")
    if not isinstance(home, dict):
        return []
    rows: list[dict[str, Any]] = []
    for device_id, meta in home.items():
        if not isinstance(meta, dict):
            continue
        kind = meta.get("kind") if isinstance(meta.get("kind"), str) else "other"
        protocol = device_id.split(":", 1)[0] if ":" in device_id else "unknown"
        rows.append(
            {
                "id": device_id,
                "name": meta.get("name") or meta.get("friendly_name") or device_id,
                "on": bool(meta.get("on")),
                "brightness": meta.get("brightness"),
                "reachable": meta.get("reachable", True) is not False,
                "kind": kind,
                "protocol": protocol,
                "room": meta.get("room"),
                "controllable": kind in ("light", "switch", "lock", "dimmer")
                or meta.get("controllable") is True,
                "capabilities": meta.get("capabilities"),
                "locked": meta.get("locked"),
                "temperature_c": meta.get("temperature_c"),
                "humidity_pct": meta.get("humidity_pct"),
                "co2_ppm": meta.get("co2_ppm"),
                "sensor_state": meta.get("sensor_state"),
                "host": meta.get("host"),
                "channel": meta.get("channel"),
                "gen": meta.get("gen"),
                "mqtt_set_topic": meta.get("mqtt_set_topic"),
                "lock_set_topic": meta.get("lock_set_topic"),
                "node_id": meta.get("node_id"),
                "endpoint": meta.get("endpoint"),
            }
        )
    rows.sort(key=lambda r: (str(r.get("kind")), str(r.get("name")).lower()))
    return rows


def _group_devices(devices: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = {
        "lights": [],
        "switches": [],
        "locks": [],
        "sensors": [],
        "other": [],
    }
    for dev in devices:
        kind = dev.get("kind")
        if kind == "light":
            groups["lights"].append(dev)
        elif kind == "switch":
            groups["switches"].append(dev)
        elif kind == "lock":
            groups["locks"].append(dev)
        elif kind == "sensor":
            groups["sensors"].append(dev)
        else:
            groups["other"].append(dev)
    return groups


def _hub_config_merged(info: dict[str, Any]) -> dict[str, Any]:
    cfg = info.get("hub_config")
    base = dict(cfg) if isinstance(cfg, dict) else {}
    automations = info.get("automations")
    if isinstance(automations, list) and automations:
        base["automations"] = automations
    return base


def build_hub() -> dict[str, Any]:
    info = _hub_info()
    state = _snapshot_state()
    now = _utc_now_iso()
    control_mode = info.get("control_mode") if isinstance(info.get("control_mode"), str) else "auto"
    return {
        "id": info.get("id") or config.LOCAL_HUB_ID,
        "user_id": "local",
        "name": info.get("name") or config.LOCAL_HUB_NAME,
        "device_type": "hub",
        "firmware_version": config.FIRMWARE_VERSION,
        "last_seen_at": now,
        "control_mode": control_mode,
        "state": state,
        "config": _hub_config_merged(info),
        "created_at": now,
        "updated_at": now,
    }


def build_status() -> dict[str, Any]:
    info = context.meta()
    state = _snapshot_state()
    return {
        "online": True,
        "source": "yellow-local",
        "airfi_online": bool(state.get("airfi_online")),
        "mqtt_ok": info.get("mqtt_ok", True),
        "automation_count": info.get("automation_count", 0),
        "cloud_sync_ok": info.get("cloud_sync_ok"),
        "cloud_sync_url": config.SYNC_URL,
        "local_api": True,
        "nextjs_url": config.LOCAL_NEXTJS_URL,
    }


def build_device_status() -> dict[str, Any]:
    info = _hub_info()
    state = _snapshot_state()
    now = _utc_now_iso()
    control_mode = info.get("control_mode") if isinstance(info.get("control_mode"), str) else "auto"
    effective = effective_control_mode(control_mode, state)
    airfi_online = bool(state.get("airfi_online"))
    hub_online = True
    level = "ok" if hub_online and airfi_online else ("degraded" if hub_online else "offline")
    message = None
    if not airfi_online:
        message = "AirFi ei vastaa Modbus-yhteydellä."

    co2 = state.get("co2_ppm")
    humidity = state.get("humidity_pct") or state.get("ventilation_humidity_pct")
    if co2 is None or humidity is None:
        home = state.get("home_devices")
        if isinstance(home, dict):
            for dev in home.values():
                if not isinstance(dev, dict):
                    continue
                if co2 is None and isinstance(dev.get("co2_ppm"), (int, float)):
                    co2 = dev["co2_ppm"]
                if humidity is None and isinstance(dev.get("humidity_pct"), (int, float)):
                    humidity = dev["humidity_pct"]

    return {
        "hub": {
            "online": hub_online,
            "last_seen_at": now,
            "last_seen_label": "Juuri nyt",
        },
        "airfi": {"online": airfi_online, "source": "hub"},
        "online": level == "ok",
        "level": level,
        "message": message,
        "checked_at": now,
        "live": {
            "control_mode": effective,
            "fan_supply_pct": state.get("fan_supply_pct"),
            "fan_exhaust_pct": state.get("fan_exhaust_pct"),
            "fan_supply_target": state.get("fan_supply_target"),
            "fan_exhaust_target": state.get("fan_exhaust_target"),
            "lto_temp_efficiency_pct": state.get("lto_temp_efficiency_pct"),
            "lto_energy_efficiency_pct": state.get("lto_energy_efficiency_pct"),
            "co2_ppm": co2,
            "humidity_pct": humidity,
            "pm25_ugm3": state.get("pm25_ugm3"),
            "temperature_c": state.get("temperature_c") or state.get("supply_room_temp_c"),
            "lto_bypass_on": bool(state.get("lto_bypass_on")),
            "fireplace_until": state.get("fireplace_until"),
            "hood_until": state.get("hood_until"),
            "away_until": state.get("away_until"),
            "away_unlimited": bool(state.get("away_unlimited")),
            "away_mode": bool(state.get("away_mode")),
            "emergency_stop": bool(state.get("emergency_stop")),
            "freezing_alarm": bool(state.get("freezing_alarm")),
            "machine_fault": bool(state.get("machine_fault")),
            "airfi_error_raw": state.get("airfi_error_raw"),
            "airfi_errors": state.get("airfi_errors") or [],
            "fan_speed_level": state.get("fan_speed_level"),
            "temp_setpoint_c": state.get("temp_setpoint_c"),
            "filter_change_per_year": state.get("filter_change_per_year"),
            "sauna_mode": bool(state.get("sauna_mode")),
            "fireplace_active": bool(state.get("fireplace_active")),
            "airfi_modbus_pause_until": state.get("airfi_modbus_pause_until"),
            "outdoor_temp_c": state.get("outdoor_temp_c"),
            "exhaust_temp_c": state.get("exhaust_temp_c"),
            "supply_room_temp_c": state.get("supply_room_temp_c"),
        },
    }


def build_lights() -> dict[str, Any]:
    state = _snapshot_state()
    devices = _device_rows(state)
    grouped = _group_devices(devices)
    return {
        "configured": True,
        "source": "yellow-local",
        "hubOnline": True,
        "devices": devices,
        **grouped,
        "lights": grouped["lights"],
        "switches": grouped["switches"],
        "sensors": grouped["sensors"],
        "locks": grouped["locks"],
        "other": grouped["other"],
    }


def build_home_devices() -> dict[str, Any]:
    state = _snapshot_state()
    devices = _device_rows(state)
    return {
        "configured": True,
        "hubOnline": True,
        "devices": [
            {
                "id": d["id"],
                "name": d["name"],
                "on": d["on"],
                "protocol": d["protocol"],
                "kind": d["kind"],
                "room": d.get("room"),
                "controllable": d.get("controllable"),
                "capabilities": d.get("capabilities"),
                "locked": d.get("locked"),
                "temperature_c": d.get("temperature_c"),
                "humidity_pct": d.get("humidity_pct"),
                "co2_ppm": d.get("co2_ppm"),
                "sensor_state": d.get("sensor_state"),
                "node_id": d.get("node_id"),
                "endpoint": d.get("endpoint"),
            }
            for d in devices
        ],
    }


def _is_em_meter(device_id: str, meta: dict[str, Any]) -> bool:
    if device_id.endswith(":em"):
        return True
    if meta.get("energy_wh") is not None or meta.get("em_phases") is not None:
        return True
    if meta.get("power_w") is not None or meta.get("power_kw") is not None:
        return True
    caps = meta.get("capabilities")
    if isinstance(caps, list):
        cap_ids = {c.get("id") for c in caps if isinstance(c, dict)}
        if "energy" in cap_ids or "meter" in cap_ids:
            return True
    return meta.get("protocol") == "shelly" and meta.get("kind") == "sensor"


def _em_meters(state: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    home = state.get("home_devices")
    if not isinstance(home, dict):
        return []
    rows = [
        (device_id, meta)
        for device_id, meta in home.items()
        if isinstance(meta, dict) and _is_em_meter(device_id, meta)
    ]
    rows.sort(key=lambda r: str(r[1].get("name") or r[0]).lower())
    return rows


def _meter_live(meta: dict[str, Any]) -> dict[str, Any]:
    phases = meta.get("em_phases") if isinstance(meta.get("em_phases"), dict) else {}
    power_kw = meta.get("power_kw")
    if power_kw is None and isinstance(meta.get("power_w"), (int, float)):
        power_kw = float(meta["power_w"]) / 1000.0
    return {
        "power_kw_total": power_kw,
        "energy_wh": meta.get("energy_wh"),
        "phases": phases,
    }


def _primary_meter_id(meters: list[tuple[str, dict[str, Any]]]) -> str | None:
    if not meters:
        return None
    return meters[0][0]


def build_energy_live() -> dict[str, Any]:
    state = _snapshot_state()
    meters = _em_meters(state)
    primary_id = _primary_meter_id(meters)
    meters_for_client = []
    primary_live = None
    for device_id, meta in meters:
        live = _meter_live(meta)
        row = {
            "id": device_id,
            "name": meta.get("name") or device_id,
            "host": meta.get("host"),
            "model": meta.get("model"),
            "live": live,
            "is_primary": device_id == primary_id,
            "counts_in_total": device_id == primary_id,
        }
        meters_for_client.append(row)
        if device_id == primary_id:
            primary_live = live
    power_total = primary_live.get("power_kw_total") if primary_live else None
    return {
        "hubOnline": True,
        "primary_meter_id": primary_id,
        "summary": {"power_kw_total": power_total},
        "meters": meters_for_client,
    }


def build_energy() -> dict[str, Any]:
    live = build_energy_live()
    empty_daily: list[dict[str, Any]] = []
    return {
        **live,
        "summary": {
            "power_kw_total": live["summary"]["power_kw_total"],
            "today_kwh": None,
            "week_kwh": None,
            "month_kwh": None,
            "today_kwh_reliable": False,
        },
        "moderation": {
            "level": "unknown",
            "label": "Ei historiatietoa",
            "detail": "Paikallinen tila — vain reaaliaikainen teho.",
            "today_vs_avg_pct": None,
        },
        "trend": {"daily": empty_daily, "outdoor_temp": [], "indoor_temp": []},
        "statistics": {
            "week": {"range_days": 7, "period_kwh": None},
            "month": {"range_days": 30, "period_kwh": None},
        },
        "cost": {
            "today_kwh": None,
            "today_cost_eur": None,
            "week_cost_eur": None,
            "month_cost_eur": None,
        },
        "insights": [],
    }


def build_floor_plan() -> dict[str, Any]:
    state = _snapshot_state()
    pins = state.get("floor_plan_pins")
    if not isinstance(pins, list):
        pins = []
    devices = _device_rows(state)
    return {
        "pins": pins,
        "devices": [
            {
                "id": d["id"],
                "name": d["name"],
                "on": d["on"],
                "protocol": d["protocol"],
                "kind": d["kind"],
                "controllable": d.get("controllable"),
                "temperature_c": d.get("temperature_c"),
                "humidity_pct": d.get("humidity_pct"),
                "co2_ppm": d.get("co2_ppm"),
                "sensor_state": d.get("sensor_state"),
                "room": d.get("room"),
                "node_id": d.get("node_id"),
            }
            for d in devices
        ],
    }


def build_automations() -> dict[str, Any]:
    info = _hub_info()
    state = _snapshot_state()
    cfg = _hub_config_merged(info)
    rules = cfg.get("automations") if isinstance(cfg.get("automations"), list) else []
    devices = _device_rows(state)
    grouped = _group_devices(devices)
    price_periods = cfg.get("electricity_price_periods")
    if not isinstance(price_periods, list):
        price_periods = []
    events = state.get("automation_events")
    if not isinstance(events, list):
        events = []
    return {
        "configured": True,
        "hubOnline": True,
        "rules": rules,
        "triggers": [d for d in devices if d.get("kind") in ("switch", "sensor", "other")],
        "targets": grouped,
        "devices": devices,
        "electricityPricePeriods": price_periods,
        "automationEvents": events,
        "switches": [d for d in devices if d.get("kind") == "switch"],
        "lights": grouped["lights"],
    }


def build_heating_thermostats() -> dict[str, Any]:
    info = _hub_info()
    state = _snapshot_state()
    cfg = _hub_config_merged(info)
    thermostats = cfg.get("heating_thermostats")
    if not isinstance(thermostats, list):
        thermostats = []
    heating_pump = cfg.get("heating_pump")
    devices = _device_rows(state)
    return {
        "configured": True,
        "hubOnline": True,
        "thermostats": thermostats,
        "heatingPump": heating_pump if isinstance(heating_pump, dict) else None,
        "sensors": [d for d in devices if d.get("kind") == "sensor"],
        "actuators": [d for d in devices if d.get("kind") in ("switch", "light")],
        "devices": devices,
        "heatingRuntime": state.get("heating_runtime") or {},
        "heatingPumpRuntime": state.get("heating_pump_runtime"),
    }


def build_device_detail(device_id: str, protocol: str | None = None) -> dict[str, Any] | None:
    decoded = unquote(device_id)
    state = _snapshot_state()
    home = state.get("home_devices")
    if not isinstance(home, dict):
        return None

    if protocol == "zwave" or decoded.startswith("zwave:"):
        node_key = decoded.split(":")[1].split("/")[0] if ":" in decoded else decoded
        nodes = state.get("zwave_nodes")
        if isinstance(nodes, dict) and node_key in nodes:
            detail = nodes[node_key]
            if isinstance(detail, dict):
                return {"configured": True, **detail}
        meta = home.get(decoded)
        if isinstance(meta, dict):
            return {
                "configured": True,
                "device": {
                    "id": decoded,
                    "name": meta.get("name") or decoded,
                    "on": bool(meta.get("on")),
                    "protocol": "zwave",
                    "kind": meta.get("kind") or "other",
                    "controllable": meta.get("controllable"),
                },
                "hubOnline": True,
                "recentEvents": [],
            }
        return None

    meta = home.get(decoded)
    if not isinstance(meta, dict):
        for key, val in home.items():
            if key == decoded or key.endswith(decoded):
                meta = val if isinstance(val, dict) else None
                decoded = key
                break
    if not isinstance(meta, dict):
        return None

    events_map = state.get("device_live_events")
    recent: list[Any] = []
    if isinstance(events_map, dict) and decoded in events_map:
        raw = events_map[decoded]
        if isinstance(raw, list):
            recent = raw

    return {
        "configured": True,
        "device": {
            "id": decoded,
            "name": meta.get("name") or decoded,
            "on": bool(meta.get("on")),
            "brightness": meta.get("brightness"),
            "protocol": meta.get("protocol") or decoded.split(":", 1)[0],
            "kind": meta.get("kind") or "other",
            "controllable": meta.get("controllable"),
            "capabilities": meta.get("capabilities"),
            "room": meta.get("room"),
        },
        "itemNames": {},
        "zwaveNode": None,
        "zwaveSiblings": [],
        "hubOnline": True,
        "recentEvents": recent,
    }


def build_control_payload(state: dict[str, Any], device_id: str, on: bool, brightness: int | None) -> dict[str, Any]:
    payload: dict[str, Any] = {"id": device_id, "on": on}
    if brightness is not None:
        payload["brightness"] = brightness
    home = state.get("home_devices")
    if isinstance(home, dict):
        meta = home.get(device_id)
        if isinstance(meta, dict):
            for key in ("host", "channel", "gen", "mqtt_set_topic", "lock_set_topic"):
                if key in meta and meta[key] is not None:
                    payload[key] = meta[key]
    return payload
