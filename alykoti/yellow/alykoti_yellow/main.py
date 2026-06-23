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
from alykoti_yellow.automations import get_engine
from alykoti_yellow.mqtt_lights import fetch_zigbee_home, set_light
from alykoti_yellow.shelly import (
    discover_shelly_devices,
    fetch_shelly_devices,
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
_feedback_lock = threading.Lock()
_executed_cmd_ids: dict[str, float] = {}
cached_integrations: dict = {}
cached_automations: list[dict] = []
cached_shelly_discovered: list[dict] = []
cached_tasmota_discovered: list[dict] = []
airfi_poll_state = AirfiPollState(
    offline_backoff_max_sec=config.AIRFI_OFFLINE_BACKOFF_MAX_SEC,
    offline_skip_after=config.AIRFI_OFFLINE_SKIP_AFTER,
)
cached_hub_state: dict = {}


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
        ok = probe_shelly(host) is not None
        if ok and cmd_id:
            _queue_ack(cmd_id)
        return ok

    if command == "tasmota_discover":
        global cached_tasmota_discovered
        subnet = payload.get("subnet")
        prefix = subnet if isinstance(subnet, str) and subnet.strip() else None
        cached_tasmota_discovered = discover_tasmota_devices(prefix)
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
        return ok

    if command == "set_fan_pct" and config.AIRFI_WRITES:
        supply = payload.get("supply_pct")
        exhaust = payload.get("exhaust_pct")
        if isinstance(supply, (int, float)) and isinstance(exhaust, (int, float)):
            snap = read_airfi(**config.airfi_kwargs(), poll_state=None)
            if snap.ok and airfi_machine_blocks_ventilation(snap.state):
                msg = "Tuuletus estetty (hätäseis tai vika koneella)"
                log.warning("set_fan_pct estetty — %s", msg)
                if cmd_id:
                    _queue_fail(cmd_id, msg)
                return False
            ok = write_fan_pct(
                **config.airfi_write_kwargs(),
                supply=int(supply),
                exhaust=int(exhaust),
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
    if state is None or not state.get("airfi_online"):
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


def apply_ventilation(response: dict, airfi_state: dict | None = None) -> None:
    if not config.AIRFI_WRITES:
        return
    if response.get("control_mode") == "manual":
        return
    block_state = airfi_state if airfi_state and airfi_state.get("airfi_online") else None
    if block_state is None:
        snap = read_airfi(**config.airfi_kwargs(), poll_state=None)
        if snap.ok:
            block_state = snap.state
    reason = _ventilation_block_reason(block_state)
    if reason is not None:
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
                log.info("AirFi tuuletus kirjoitettu: tulo %s%% poisto %s%%", supply, exhaust)
            else:
                log.warning("AirFi tuuletus kirjoitus epäonnistui: %s/%s", supply, exhaust)
        except Exception as exc:
            log.warning("AirFi tuuletus virhe: %s", exc)


def build_state(
    integrations: dict | None = None,
    shelly_discovered: list[dict] | None = None,
    tasmota_discovered: list[dict] | None = None,
) -> dict:
    state: dict = {}

    if config.AIRFI_ENABLED:
        airfi = read_airfi(**config.airfi_kwargs(), poll_state=airfi_poll_state)
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
            home_devices.update(fetch_tasmota_devices(tasmota_cfg))
        except Exception as exc:
            log.warning("Tasmota read failed: %s", exc)

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

    return state


def _airfi_snapshot(state: dict) -> dict:
    keys = (
        "airfi_online",
        "fan_supply_pct",
        "fan_exhaust_pct",
        "emergency_stop",
        "machine_fault",
        "freezing_alarm",
        "airfi_error_raw",
        "airfi_errors",
        "airfi_modbus_pause_until",
        "forced_control",
    )
    return {k: state[k] for k in keys if k in state}


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
    global cached_automations, cached_integrations

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
        get_engine().update_config(
            cached_automations,
            cached_integrations,
            hub_state.get("home_devices") if isinstance(hub_state.get("home_devices"), dict) else None,
        )

    commands = response.get("commands") or []
    cmd_count = _process_commands(commands)
    if commands:
        log.info("Komennot suoritettu: %s", cmd_count)
    if apply_vent:
        apply_ventilation(response, hub_state if hub_state.get("airfi_online") else None)
    return cmd_count


def run_fast_poll_loop() -> None:
    global cached_hub_state

    log.info("Nopea komentopollaus %ss välein", config.COMMAND_POLL_INTERVAL_SEC)
    while True:
        try:
            acks, fails = _drain_pending_feedback()
            snapshot = _airfi_snapshot(cached_hub_state)
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


def main() -> None:
    if config.COMMAND_POLL_ENABLED:
        threading.Thread(
            target=run_fast_poll_loop,
            name="command-poll",
            daemon=True,
        ).start()
    run_loop()


if __name__ == "__main__":
    main()
