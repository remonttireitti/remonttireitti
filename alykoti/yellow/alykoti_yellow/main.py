#!/usr/bin/env python3
"""Alykoti Yellow — Zigbee + Z-Wave + Vercel synkki."""

from __future__ import annotations

import logging
import sys
import threading
import time

from alykoti_yellow import config
from alykoti_yellow.modbus_airfi import (
    AirfiPollState,
    ack_airfi_alarms,
    airfi_ack_cooldown_active,
    airfi_stuck_direct_emergency,
    airfi_auto_ventilation_blocked,
    airfi_machine_blocks_ventilation,
    airfi_writes_pause_until_iso,
    read_airfi,
    write_away,
    write_fan_pct,
    write_fireplace,
    write_sauna_mode,
    write_speed_level,
    write_temp_setpoint,
)
from alykoti_yellow.device_commands import (
    zigbee_permit_join,
    zigbee_rename,
    zwave_set_node_name,
    zwave_start_inclusion,
    zwave_stop_inclusion,
)
from alykoti_yellow.heating import apply_heating_thermostats
from alykoti_yellow.automations import get_engine
from alykoti_yellow.local_cache import load_hub_cache, save_hub_cache
from alykoti_yellow.local_store import (
    load_local_store,
    migrate_cache_to_local,
    persist_local_snapshot,
)
from alykoti_yellow.ventilation_local import (
    collect_ventilation_humidity_pct,
    compute_ventilation_targets,
    effective_control_mode,
    parse_ventilation_config,
)
from alykoti_yellow.mqtt_lights import fetch_zigbee_home, set_light
from alykoti_yellow.shelly import (
    discover_shelly_devices,
    fetch_shelly_devices,
    fetch_shelly_em_live,
    probe_shelly,
    set_shelly_switch,
)
from alykoti_yellow.tasmota import (
    discover_tasmota_devices,
    fetch_tasmota_devices,
    probe_tasmota,
    set_tasmota_power,
)
from alykoti_yellow.sync import quick_pull, sync_post
from alykoti_yellow.zwave_mqtt import fetch_zwave_devices, set_zwave_device, set_zwave_lock, set_zwave_property

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("alykoti-yellow")

pending_acks: list[str] = []
pending_fails: list[dict[str, str]] = []
_sync_lock = threading.RLock()
_last_cloud_sync_ok: float | None = None
_feedback_lock = threading.Lock()
_executed_cmd_ids: dict[str, float] = {}
cached_integrations: dict = {}
cached_automations: list[dict] = []
cached_hub_config: dict = {}
cached_control_mode: str = "auto"
cached_shelly_discovered: list[dict] = []
cached_tasmota_discovered: list[dict] = []
airfi_poll_state = AirfiPollState(
    offline_backoff_max_sec=config.AIRFI_OFFLINE_BACKOFF_MAX_SEC,
    offline_skip_after=config.AIRFI_OFFLINE_SKIP_AFTER,
)
cached_hub_state: dict = {}
cached_airfi_state: dict = {}
_cached_airfi_at: float = 0.0


def _update_cached_airfi(state: dict) -> None:
    global _cached_airfi_at
    cached_airfi_state.clear()
    cached_airfi_state.update(state)
    _cached_airfi_at = time.monotonic()


def _cached_airfi_for_control() -> dict | None:
    if not cached_airfi_state:
        return None
    if time.monotonic() - _cached_airfi_at > config.AIRFI_CACHE_MAX_AGE_SEC:
        return None
    return cached_airfi_state


def _queue_ack(cmd_id: str) -> None:
    if not cmd_id:
        return
    with _feedback_lock:
        pending_acks.append(cmd_id)


def _queue_fail(cmd_id: str, message: str) -> None:
    if not cmd_id:
        return
    with _feedback_lock:
        pending_fails.append({"id": cmd_id, "message": message})


def _drain_pending_feedback() -> tuple[list[str], list[dict[str, str]]]:
    with _feedback_lock:
        acks = pending_acks[:]
        pending_acks.clear()
        fails = pending_fails[:]
        pending_fails.clear()
        return acks, fails


def _remember_executed(cmd_id: str) -> bool:
    """Return True if this command already succeeded recently."""
    if not cmd_id:
        return False
    now = time.time()
    with _sync_lock:
        expired = [k for k, t in _executed_cmd_ids.items() if now - t > 120]
        for k in expired:
            del _executed_cmd_ids[k]
        return cmd_id in _executed_cmd_ids


def _mark_executed(cmd_id: str) -> None:
    if not cmd_id:
        return
    with _sync_lock:
        _executed_cmd_ids[cmd_id] = time.time()


def _upsert_shelly_discovered(item: dict) -> None:
    global cached_shelly_discovered
    host_key = item.get("host")
    if not isinstance(host_key, str):
        return
    for idx, existing in enumerate(cached_shelly_discovered):
        if existing.get("host") == host_key:
            cached_shelly_discovered[idx] = item
            return
    cached_shelly_discovered.append(item)


def execute_command(cmd: dict) -> bool:
    command = cmd.get("command", "")
    payload = cmd.get("payload") or {}
    cmd_id = cmd.get("id", "")

    if command == "zigbee_permit_join":
        seconds = payload.get("seconds", 254)
        ok = zigbee_permit_join(
            config.MQTT_URL,
            config.MQTT_PREFIX,
            int(seconds) if isinstance(seconds, (int, float)) else 254,
        )
        if ok and cmd_id:
            _queue_ack(cmd_id)
        return ok

    if command == "zwave_start_inclusion":
        ok = zwave_start_inclusion(
            config.MQTT_URL, config.ZWAVE_PREFIX, config.ZWAVE_GATEWAY
        )
        if ok and cmd_id:
            _queue_ack(cmd_id)
        return ok

    if command == "zwave_stop_inclusion":
        ok = zwave_stop_inclusion(
            config.MQTT_URL, config.ZWAVE_PREFIX, config.ZWAVE_GATEWAY
        )
        if ok and cmd_id:
            _queue_ack(cmd_id)
        return ok

    if command == "rename_device":
        device_id = payload.get("id")
        new_name = payload.get("name")
        if not isinstance(device_id, str) or not isinstance(new_name, str):
            return False
        ok = False
        if device_id.startswith("zigbee:"):
            old = device_id.removeprefix("zigbee:")
            ok = zigbee_rename(config.MQTT_URL, config.MQTT_PREFIX, old, new_name)
        elif device_id.startswith("zwave:"):
            node_id = payload.get("node_id")
            if isinstance(node_id, int):
                ok = zwave_set_node_name(
                    config.MQTT_URL,
                    config.ZWAVE_PREFIX,
                    node_id,
                    new_name,
                    config.ZWAVE_GATEWAY,
                )
        if ok and cmd_id:
            _queue_ack(cmd_id)
        return ok

    if command == "shelly_discover":
        global cached_shelly_discovered
        subnet = payload.get("subnet")
        prefix = subnet if isinstance(subnet, str) and subnet.strip() else None
        cached_shelly_discovered = discover_shelly_devices(prefix)
        if cmd_id:
            _queue_ack(cmd_id)
        return True

    if command == "shelly_probe":
        host = payload.get("host")
        if not isinstance(host, str):
            return False
        result = probe_shelly(host)
        if result:
            _upsert_shelly_discovered(result)
        ok = result is not None
        if ok and cmd_id:
            _queue_ack(cmd_id)
        return ok

    if command == "tasmota_discover":
        global cached_tasmota_discovered
        subnet = payload.get("subnet")
        prefix = subnet if isinstance(subnet, str) and subnet.strip() else None
        configured_hosts = [
            d.get("host")
            for d in (cached_integrations.get("tasmota", {}).get("devices") or [])
            if isinstance(d.get("host"), str) and d.get("host", "").strip()
        ]
        cached_tasmota_discovered = discover_tasmota_devices(
            prefix,
            extra_hosts=configured_hosts,
        )
        if cmd_id:
            _queue_ack(cmd_id)
        return True

    if command == "tasmota_probe":
        host = payload.get("host")
        if not isinstance(host, str):
            return False
        ok = probe_tasmota(host) is not None
        if ok and cmd_id:
            _queue_ack(cmd_id)
        return ok

    if command == "set_zwave_property":
        mqtt_topic = payload.get("mqtt_topic")
        value = payload.get("value")
        if isinstance(mqtt_topic, str) and value is not None:
            ok = set_zwave_property(config.MQTT_URL, mqtt_topic, value)
            if ok and cmd_id:
                _queue_ack(cmd_id)
            return ok
        return False

    if command in ("set_light", "set_device"):
        device_id = payload.get("id")
        on = payload.get("on")
        if not isinstance(device_id, str) or not isinstance(on, bool):
            return False

        ok = False
        if device_id.startswith("zwave:"):
            lock_topic = payload.get("lock_set_topic")
            if isinstance(lock_topic, str):
                log.info("Z-Wave lukko %s -> %s", device_id, on)
                ok = set_zwave_lock(config.MQTT_URL, lock_topic, on)
            else:
                mqtt_topic = payload.get("mqtt_set_topic")
                if isinstance(mqtt_topic, str):
                    log.info("Z-Wave ohjaus %s -> %s (%s)", device_id, on, mqtt_topic)
                    ok = set_zwave_device(config.MQTT_URL, mqtt_topic, on)
                    if ok and isinstance(payload.get("brightness"), (int, float)):
                        ok = set_zwave_device(
                            config.MQTT_URL,
                            mqtt_topic,
                            on,
                            int(payload["brightness"]),
                        )
        elif device_id.startswith("zigbee:"):
            ok = set_light(
                config.MQTT_URL,
                config.MQTT_PREFIX,
                device_id.removeprefix("zigbee:"),
                on,
            )
            if ok and isinstance(payload.get("brightness"), (int, float)):
                from alykoti_yellow.mqtt_lights import set_light_brightness

                ok = set_light_brightness(
                    config.MQTT_URL,
                    config.MQTT_PREFIX,
                    device_id.removeprefix("zigbee:"),
                    int(payload["brightness"]),
                    on,
                )
        elif device_id.startswith("shelly:"):
            host = payload.get("host")
            channel = payload.get("channel", 0)
            gen = payload.get("gen", 2)
            if isinstance(host, str) and isinstance(channel, (int, float)):
                gen_num = int(gen) if isinstance(gen, (int, float)) else 2
                ok = set_shelly_switch(host, int(channel), on, gen=gen_num)
        elif device_id.startswith("tasmota:"):
            host = payload.get("host")
            channel = payload.get("channel", 0)
            if isinstance(host, str) and isinstance(channel, (int, float)):
                ok = set_tasmota_power(host, int(channel), on)
        else:
            ok = set_light(config.MQTT_URL, config.MQTT_PREFIX, device_id, on)

        if ok and cmd_id:
            _queue_ack(cmd_id)
        if (
            ok
            and device_id.startswith("zwave:")
            and not payload.get("_skip_ui_mirror")
        ):
            get_engine().apply_ui_mirror(device_id, on)
        return ok

    if command == "set_fan_pct" and config.AIRFI_WRITES:
        supply = payload.get("supply_pct")
        exhaust = payload.get("exhaust_pct")
        if isinstance(supply, (int, float)) and isinstance(exhaust, (int, float)):
            airfi_poll_state.reset()
            ok = write_fan_pct(
                **config.airfi_write_kwargs(),
                supply=int(supply),
                exhaust=int(exhaust),
                known_state=_cached_airfi_for_control(),
            )
            if ok and cmd_id:
                _queue_ack(cmd_id)
            return ok
        return False

    if command == "set_away" and config.AIRFI_WRITES:
        away = payload.get("away")
        if isinstance(away, bool):
            ok = write_away(**config.airfi_write_kwargs(), away=away)
            if ok and cmd_id:
                _queue_ack(cmd_id)
            return ok
        return False

    if command == "set_temp_setpoint" and config.AIRFI_WRITES:
        temp_c = payload.get("temp_c")
        if isinstance(temp_c, (int, float)):
            ok = write_temp_setpoint(
                **config.airfi_write_kwargs(),
                temp_c=float(temp_c),
            )
            if ok and cmd_id:
                _queue_ack(cmd_id)
            return ok
        return False

    if command == "set_sauna_mode" and config.AIRFI_WRITES:
        active = payload.get("active")
        if isinstance(active, bool):
            ok = write_sauna_mode(**config.airfi_write_kwargs(), active=active)
            if ok and cmd_id:
                _queue_ack(cmd_id)
            return ok
        return False

    if command == "ack_airfi_alarms" and config.AIRFI_WRITES:
        ok = ack_airfi_alarms(**config.airfi_write_kwargs())
        if ok and cmd_id:
            _queue_ack(cmd_id)
        return ok

    if command == "set_fireplace_mode" and config.AIRFI_WRITES:
        active = payload.get("active")
        if isinstance(active, bool):
            ok = write_fireplace(**config.airfi_write_kwargs(), active=active)
            if ok and cmd_id:
                _queue_ack(cmd_id)
            return ok
        return False

    if command == "set_fan_speed_level" and config.AIRFI_WRITES:
        level = payload.get("level")
        if isinstance(level, (int, float)) and 0 <= int(level) <= 5:
            ok = write_speed_level(**config.airfi_write_kwargs(), level=int(level))
            if ok and cmd_id:
                _queue_ack(cmd_id)
            return ok
        return False

    if command == "set_mode":
        if cmd_id:
            _queue_ack(cmd_id)
        return True

    log.warning("Unknown or blocked command: %s", command)
    return False


def _ventilation_block_reason(state: dict | None) -> str | None:
    if state is None:
        return "ei luentaa"
    if airfi_ack_cooldown_active():
        return "kuittauksen jälkeinen tauko"
    if state.get("emergency_stop"):
        return "hätäseis"
    if state.get("machine_fault"):
        return "konevika"
    if state.get("freezing_alarm"):
        return "jäätymisvaara"
    raw = state.get("airfi_error_raw")
    if isinstance(raw, int) and (raw & 2) != 0:
        return "E1"
    return None


_last_ventilation_write_at: float = 0.0
_last_ventilation_fail_at: float = 0.0
_last_airfi_emergency_recovery_at: float = 0.0
VENTILATION_WRITE_MIN_INTERVAL_SEC = 10.0
VENTILATION_WRITE_FAIL_BACKOFF_SEC = 120.0
AIRFI_EMERGENCY_RECOVERY_MIN_INTERVAL_SEC = 180.0


def _try_recover_stuck_airfi_emergency(state: dict) -> bool:
    """Poista suoraohjaus jäljiltä jäänyt E1/hätäseis (ohjelmiston aiheuttama tila)."""
    global _last_airfi_emergency_recovery_at
    if not airfi_stuck_direct_emergency(state):
        return False
    if airfi_ack_cooldown_active():
        return False
    now = time.monotonic()
    if now - _last_airfi_emergency_recovery_at < AIRFI_EMERGENCY_RECOVERY_MIN_INTERVAL_SEC:
        return False
    _last_airfi_emergency_recovery_at = now
    log.info("AirFi hätäseis + suoraohjaus 0 %% — yritetään palauttaa automaattitilaan")
    ok = ack_airfi_alarms(**config.airfi_write_kwargs())
    if ok:
        log.info("AirFi hätäseis palautettu — suoraohjaus poistettu")
    else:
        log.warning("AirFi hätäseis-palautus epäonnistui (Modbus)")
    return ok


def _apply_hub_snapshot(snap: dict) -> None:
    global cached_automations, cached_integrations, cached_hub_config, cached_control_mode, cached_hub_state

    if isinstance(snap.get("automations"), list):
        cached_automations = snap["automations"]
    if isinstance(snap.get("integrations"), dict):
        cached_integrations = snap["integrations"]
    if isinstance(snap.get("hub_config"), dict):
        cached_hub_config = snap["hub_config"]
    if isinstance(snap.get("control_mode"), str):
        cached_control_mode = snap["control_mode"]
    if isinstance(snap.get("home_devices"), dict):
        cached_hub_state = {"home_devices": snap["home_devices"]}

    home = snap.get("home_devices") if isinstance(snap.get("home_devices"), dict) else None
    get_engine().update_config(cached_automations, cached_integrations, home)
    save_hub_cache(
        automations=cached_automations,
        integrations=cached_integrations,
        home_devices=home,
        hub_config=cached_hub_config,
        control_mode=cached_control_mode,
    )
    if cached_automations or cached_integrations:
        persist_local_snapshot(
            {
                "automations": cached_automations,
                "integrations": cached_integrations,
                "hub_config": cached_hub_config,
                "control_mode": cached_control_mode,
            }
        )


def _bootstrap_from_local() -> None:
    local = load_local_store()
    if isinstance(local, dict) and isinstance(local.get("automations"), list) and local["automations"]:
        _apply_hub_snapshot(local)
        log.info(
            "Käynnistys paikallisista tiedostoista — automaatiot=%s",
            len(local["automations"]),
        )
        return

    cache = load_hub_cache()
    if isinstance(cache, dict):
        autos = cache.get("automations")
        if not isinstance(autos, list) or not autos:
            hub_cfg = cache.get("hub_config")
            if isinstance(hub_cfg, dict) and isinstance(hub_cfg.get("automations"), list):
                cache = {**cache, "automations": hub_cfg["automations"]}
        if migrate_cache_to_local(cache):
            _apply_hub_snapshot(cache)
            return
        if isinstance(cache.get("automations"), list) and cache["automations"]:
            _apply_hub_snapshot(cache)
            log.info(
                "Käynnistys välimuistista — automaatiot=%s",
                len(cache["automations"]),
            )
            return

    log.warning(
        "Ei paikallisia automaatioita — lisää local/automations.json tai odota onnistunutta synkkiä"
    )


def apply_local_ventilation(state: dict) -> None:
    """Laske ja kirjoita IV-tuuletus Yellowlla — ei odota pilveä."""
    global _last_ventilation_write_at, _last_ventilation_fail_at
    if not config.AIRFI_WRITES:
        return
    mode = effective_control_mode(
        cached_control_mode,
        {**cached_hub_state, **state},
    )
    if mode == "manual":
        return
    now = time.monotonic()
    if now - _last_ventilation_write_at < VENTILATION_WRITE_MIN_INTERVAL_SEC:
        return
    if now - _last_ventilation_fail_at < VENTILATION_WRITE_FAIL_BACKOFF_SEC:
        return

    airfi_state = state if state.get("airfi_online") else _cached_airfi_for_control()
    if not airfi_state:
        return
    reason = _ventilation_block_reason(airfi_state)
    if reason is not None:
        return

    vent_cfg = parse_ventilation_config(cached_hub_config)
    home_devices = state.get("home_devices") if isinstance(state.get("home_devices"), dict) else {}
    humidity = collect_ventilation_humidity_pct(
        home_devices,
        airfi_humidity=airfi_state.get("humidity_pct") or airfi_state.get("internal_humidity"),
    )
    inputs = {
        "co2": state.get("co2_ppm"),
        "pm25": state.get("pm25_ugm3"),
        "humidity": humidity,
        "indoor_temp_c": state.get("temperature_c") or airfi_state.get("supply_room_temp_c"),
        "outdoor_temp_c": airfi_state.get("outdoor_temp_c"),
    }
    targets = compute_ventilation_targets(
        mode,
        inputs,
        vent_cfg,
        airfi_state,
    )
    if not targets or not targets.get("needs_write"):
        return
    try:
        fireplace = bool(targets.get("fireplace"))
        if fireplace != bool(airfi_state.get("fireplace_active")):
            write_fireplace(**config.airfi_write_kwargs(), active=fireplace)
        ok = write_fan_pct(
            **config.airfi_write_kwargs(),
            supply=int(targets["supply"]),
            exhaust=int(targets["exhaust"]),
            known_state=airfi_state,
        )
        if ok:
            _last_ventilation_write_at = now
            _last_ventilation_fail_at = 0.0
            log.info(
                "AirFi paikallinen tuuletus: tulo %s%% poisto %s%%",
                targets["supply"],
                targets["exhaust"],
            )
        else:
            _last_ventilation_fail_at = now
    except Exception as exc:
        _last_ventilation_fail_at = now
        log.warning("AirFi paikallinen tuuletus virhe: %s", exc)


def apply_ventilation(response: dict, airfi_state: dict | None = None) -> None:
    global _last_ventilation_write_at, _last_ventilation_fail_at
    if not config.AIRFI_WRITES:
        return
    if response.get("control_mode") == "manual":
        return
    now = time.monotonic()
    if now - _last_ventilation_write_at < VENTILATION_WRITE_MIN_INTERVAL_SEC:
        return
    if now - _last_ventilation_fail_at < VENTILATION_WRITE_FAIL_BACKOFF_SEC:
        return
    block_state = airfi_state or _cached_airfi_for_control()
    if block_state is None:
        log.debug("AirFi tuuletus ohitetaan — ei tuoretta eikä välimuistiluentaa")
        return
    reason = _ventilation_block_reason(block_state)
    if reason is not None:
        if reason in ("hätäseis", "E1"):
            _try_recover_stuck_airfi_emergency(block_state)
        log.info("AirFi tuuletus ohitetaan — %s", reason)
        return
    vent = response.get("ventilation")
    if not isinstance(vent, dict):
        return
    supply = vent.get("fan_supply_target")
    exhaust = vent.get("fan_exhaust_target")
    if isinstance(supply, (int, float)) and isinstance(exhaust, (int, float)):
        try:
            ok = write_fan_pct(
                **config.airfi_write_kwargs(),
                supply=int(supply),
                exhaust=int(exhaust),
                known_state=block_state,
            )
            if ok:
                _last_ventilation_write_at = now
                _last_ventilation_fail_at = 0.0
                log.info("AirFi tuuletus kirjoitettu: tulo %s%% poisto %s%%", supply, exhaust)
            else:
                _last_ventilation_fail_at = now
                log.warning("AirFi tuuletus kirjoitus epäonnistui: %s/%s", supply, exhaust)
        except Exception as exc:
            log.warning("AirFi tuuletus virhe: %s", exc)


def build_state(
    integrations: dict | None = None,
    shelly_discovered: list[dict] | None = None,
    tasmota_discovered: list[dict] | None = None,
) -> dict:
    global cached_airfi_state
    state: dict = {}

    if config.AIRFI_ENABLED:
        airfi_kw = {
            **config.airfi_kwargs(),
            "poll_state": airfi_poll_state,
        }
        airfi = read_airfi(**airfi_kw)
        if airfi.ok:
            _update_cached_airfi(airfi.state)
            state.update(airfi.state)
        elif cached_airfi_state:
            state.update(cached_airfi_state)
            state["airfi_online"] = False
        else:
            state.update(airfi.state)
        pause_until = airfi_writes_pause_until_iso()
        if pause_until:
            state["airfi_modbus_pause_until"] = pause_until
        if not airfi.ok and airfi_poll_state.should_poll():
            target = (
                f"{config.AIRFI_MODBUS_HOST}:{config.AIRFI_MODBUS_PORT}"
                if config.AIRFI_MODBUS_HOST
                else config.AIRFI_SERIAL or "?"
            )
            log.warning("AirFi Modbus ei vastaa (%s unit %s)", target, config.AIRFI_UNIT)
        elif not airfi.ok and not airfi_poll_state.should_poll():
            log.debug("AirFi poll ohitettu backoffin takia")
    else:
        state["airfi_online"] = False
        log.debug("AirFi Modbus pois (AIRFI_ENABLED=0)")

    home_devices: dict[str, dict] = {}

    try:
        home_devices.update(
            fetch_zigbee_home(config.MQTT_URL, config.MQTT_PREFIX, timeout_sec=4.0)
        )
    except Exception as exc:
        log.warning("Zigbee read failed: %s", exc)

    try:
        zwave_result = fetch_zwave_devices(
            config.MQTT_URL,
            config.ZWAVE_PREFIX,
            config.ZWAVE_NODES_JSON,
            timeout_sec=8.0,
            gateway=config.ZWAVE_GATEWAY,
        )
        if isinstance(zwave_result, dict) and "devices" in zwave_result:
            home_devices.update(zwave_result["devices"])
            nodes = zwave_result.get("nodes")
            if nodes:
                state["zwave_nodes"] = nodes
        else:
            home_devices.update(zwave_result)
    except Exception as exc:
        log.warning("Z-Wave read failed: %s", exc)

    shelly_cfg = (integrations or {}).get("shelly", {}).get("devices") or []
    if shelly_cfg:
        try:
            home_devices.update(fetch_shelly_devices(shelly_cfg))
        except Exception as exc:
            log.warning("Shelly read failed: %s", exc)

    tasmota_cfg = (integrations or {}).get("tasmota", {}).get("devices") or []
    if tasmota_cfg:
        try:
            prev_home = cached_hub_state.get("home_devices")
            previous = prev_home if isinstance(prev_home, dict) else None
            home_devices.update(fetch_tasmota_devices(tasmota_cfg, previous=previous))
        except Exception as exc:
            log.warning("Tasmota read failed: %s", exc)

    cached_devices = cached_hub_state.get("home_devices")
    if isinstance(cached_devices, dict) and cached_devices:
        home_devices = _merge_home_devices(cached_devices, home_devices)

    if home_devices:
        state["home_devices"] = home_devices
        lights = {
            k: {
                "on": v.get("on", False),
                "brightness": v.get("brightness"),
                "name": v.get("name"),
            }
            for k, v in home_devices.items()
            if v.get("kind") == "light"
        }
        if lights:
            state["lights"] = lights

    if shelly_discovered:
        state["shelly_discovered"] = shelly_discovered

    if tasmota_discovered:
        state["tasmota_discovered"] = tasmota_discovered

    state["automation_events"] = get_engine().get_events()
    state["device_live_events"] = get_engine().get_device_events()
    state["yellow_capabilities"] = {
        "local_automation": True,
        "local_ventilation": True,
    }

    heating_runtime = cached_hub_state.get("heating_runtime")
    if isinstance(heating_runtime, dict) and heating_runtime:
        state["heating_runtime"] = heating_runtime

    heating_pump_runtime = cached_hub_state.get("heating_pump_runtime")
    if isinstance(heating_pump_runtime, dict) and heating_pump_runtime:
        state["heating_pump_runtime"] = heating_pump_runtime

    return state


def _airfi_snapshot(state: dict) -> dict:
    keys = (
        "airfi_online",
        "airfi_updated_at",
        "outdoor_temp_c",
        "exhaust_temp_c",
        "supply_room_temp_c",
        "exhaust_hru_temp_c",
        "fan_supply_pct",
        "fan_exhaust_pct",
        "fan_supply_target",
        "fan_exhaust_target",
        "lto_temp_efficiency_pct",
        "lto_energy_efficiency_pct",
        "lto_bypass_on",
        "humidity_pct",
        "emergency_stop",
        "machine_fault",
        "freezing_alarm",
        "airfi_error_raw",
        "airfi_errors",
        "airfi_modbus_pause_until",
        "forced_control",
    )
    return {k: state[k] for k in keys if k in state}


def _shelly_em_snapshot(integrations: dict | None) -> dict[str, dict]:
    shelly_cfg = (integrations or {}).get("shelly", {}).get("devices") or []
    if not shelly_cfg:
        return {}
    try:
        return fetch_shelly_em_live(shelly_cfg)
    except Exception as exc:
        log.debug("Shelly EM quick poll failed: %s", exc)
        return {}


def _merge_home_devices(base: dict, patch: dict) -> dict:
    if not patch:
        return base
    merged = dict(base)
    for device_id, meta in patch.items():
        if not isinstance(meta, dict):
            continue
        prev = merged.get(device_id)
        if isinstance(prev, dict):
            merged[device_id] = {**prev, **meta}
        else:
            merged[device_id] = meta
    return merged


def _process_commands(commands: list[dict]) -> int:
    count = 0
    with _sync_lock:
        for cmd in commands:
            cmd_id = cmd.get("id", "")
            if cmd_id and _remember_executed(cmd_id):
                log.debug("Skip duplicate command %s", cmd_id)
                continue
            ok = execute_command(cmd)
            if ok:
                count += 1
                if cmd_id:
                    _mark_executed(cmd_id)
            elif cmd_id:
                with _feedback_lock:
                    already_failed = any(f.get("id") == cmd_id for f in pending_fails)
                    already_acked = cmd_id in pending_acks
                if not already_failed and not already_acked:
                    _queue_fail(cmd_id, "Ohjaus epäonnistui")
    return count


def _process_sync_response(
    response: dict,
    hub_state: dict,
    *,
    update_engine: bool = True,
    apply_vent: bool = True,
) -> int:
    global cached_automations, cached_integrations, cached_hub_config, cached_control_mode

    if update_engine:
        integrations = response.get("integrations")
        if isinstance(integrations, dict):
            cached_integrations = integrations
        automations = response.get("automations")
        if isinstance(automations, list):
            cached_automations = automations
        elif isinstance(response.get("config"), dict):
            cfg_auto = response["config"].get("automations")
            if isinstance(cfg_auto, list):
                cached_automations = cfg_auto
        cfg = response.get("config")
        if isinstance(cfg, dict):
            cached_hub_config = cfg
        mode = response.get("control_mode")
        if isinstance(mode, str):
            cached_control_mode = mode
        get_engine().update_config(
            cached_automations,
            cached_integrations,
            hub_state.get("home_devices") if isinstance(hub_state.get("home_devices"), dict) else None,
        )
        save_hub_cache(
            automations=cached_automations,
            integrations=cached_integrations,
            home_devices=hub_state.get("home_devices")
            if isinstance(hub_state.get("home_devices"), dict)
            else None,
            hub_config=cached_hub_config,
            control_mode=cached_control_mode,
        )
        persist_local_snapshot(
            {
                "automations": cached_automations,
                "integrations": cached_integrations,
                "hub_config": cached_hub_config,
                "control_mode": cached_control_mode,
            }
        )

    commands = response.get("commands") or []
    cmd_count = _process_commands(commands)
    if commands:
        log.info("Komennot suoritettu: %s", cmd_count)
    if apply_vent:
        vent_state = hub_state if hub_state.get("airfi_online") else _cached_airfi_for_control()
        apply_ventilation(response, vent_state)
    apply_heating_thermostats(response, hub_state, hub_config=cached_hub_config)
    return cmd_count


def run_fast_poll_loop() -> None:
    global cached_hub_state

    energy_every = max(
        1,
        round(config.ENERGY_QUICK_POLL_SEC / config.COMMAND_POLL_INTERVAL_SEC),
    )
    log.info(
        "Nopea komentopollaus %ss välein (Shelly EM %ss)",
        config.COMMAND_POLL_INTERVAL_SEC,
        config.ENERGY_QUICK_POLL_SEC,
    )
    tick = 0
    while True:
        try:
            tick += 1

            acks, fails = _drain_pending_feedback()
            snapshot = _airfi_snapshot(cached_hub_state)
            if tick % energy_every == 0:
                em_patch = _shelly_em_snapshot(cached_integrations)
                if em_patch:
                    home = cached_hub_state.get("home_devices")
                    if not isinstance(home, dict):
                        home = {}
                    cached_hub_state["home_devices"] = _merge_home_devices(home, em_patch)
                    snapshot["home_devices"] = em_patch
            response = quick_pull(
                config.SYNC_URL,
                config.DEVICE_TOKEN,
                snapshot,
                acks,
                fails,
            )
            if response:
                _process_sync_response(
                    response,
                    cached_hub_state,
                    update_engine=False,
                    apply_vent=False,
                )
        except Exception as exc:
            log.warning("Komentopollaus virhe: %s", exc)
        time.sleep(config.COMMAND_POLL_INTERVAL_SEC)


def run_loop() -> None:
    global cached_shelly_discovered, cached_tasmota_discovered, cached_hub_state

    engine = get_engine()
    engine.start()

    if not config.DEVICE_TOKEN:
        log.error("ALYKOTI_DEVICE_TOKEN puuttuu — luo hub webissä ja kopioi token .env")
        sys.exit(1)

    log.info(
        "Synkki käynnissä → %s (tila %ss, komento %ss)",
        config.SYNC_URL,
        config.SYNC_INTERVAL_SEC,
        config.COMMAND_POLL_INTERVAL_SEC if config.COMMAND_POLL_ENABLED else "off",
    )

    while True:
        state = build_state(
            cached_integrations,
            cached_shelly_discovered,
            cached_tasmota_discovered,
        )
        apply_local_ventilation(state)

        acks, fails = _drain_pending_feedback()
        response = sync_post(
            config.SYNC_URL,
            config.DEVICE_TOKEN,
            state,
            config.FIRMWARE_VERSION,
            acks,
            fails,
        )

        if response:
            global _last_cloud_sync_ok
            _last_cloud_sync_ok = time.monotonic()
            cached_hub_state = state
            _process_sync_response(response, state, update_engine=True, apply_vent=True)
            devices = state.get("home_devices") or {}
            lights = sum(1 for d in devices.values() if d.get("kind") == "light")
            auto_count = len(cached_automations)
            log.info(
                "Sync OK — airfi=%s devices=%s lights=%s zwave=%s shelly=%s tasmota=%s cmds=%s automations=%s",
                "online" if state.get("airfi_online") else "offline",
                len(devices),
                lights,
                sum(1 for k in devices if k.startswith("zwave:")),
                sum(1 for k in devices if k.startswith("shelly:")),
                sum(1 for k in devices if k.startswith("tasmota:")),
                len(response.get("commands") or []),
                auto_count,
            )
        else:
            log.warning("Sync skipped")

        time.sleep(config.SYNC_INTERVAL_SEC)


def _local_ui_state() -> dict:
    state = build_state(
        cached_integrations,
        cached_shelly_discovered,
        cached_tasmota_discovered,
    )
    return {**cached_hub_state, **state}


def _local_ui_meta() -> dict:
    cloud_ok = (
        _last_cloud_sync_ok is not None
        and time.monotonic() - _last_cloud_sync_ok < config.SYNC_INTERVAL_SEC * 2.5
    )
    return {
        "automation_count": len(cached_automations),
        "cloud_sync_ok": cloud_ok,
        "mqtt_ok": True,
    }


def _local_hub_info() -> dict:
    return {
        "id": config.LOCAL_HUB_ID,
        "name": config.LOCAL_HUB_NAME,
        "control_mode": cached_control_mode,
        "hub_config": cached_hub_config,
        "automations": cached_automations,
        "integrations": cached_integrations,
        "cached_state": cached_hub_state,
    }


def _local_execute_command(cmd: dict) -> bool:
    return execute_command({"id": "local-ui", **cmd})


def _start_local_ui() -> None:
    from alykoti_yellow.local_ui import context as local_ui_context
    from alykoti_yellow.local_ui.server import start_local_ui

    local_ui_context.bind(
        get_state=_local_ui_state,
        execute_command=_local_execute_command,
        get_meta=_local_ui_meta,
        get_hub_info=_local_hub_info,
    )
    start_local_ui()


def main() -> None:
    airfi_poll_state.reset()
    _bootstrap_from_local()
    _start_local_ui()
    if config.COMMAND_POLL_ENABLED:
        threading.Thread(
            target=run_fast_poll_loop,
            name="command-poll",
            daemon=True,
        ).start()
    run_loop()


if __name__ == "__main__":
    main()
