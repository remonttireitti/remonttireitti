#!/usr/bin/env python3
"""Alykoti Yellow — Zigbee + Z-Wave + Vercel synkki."""

from __future__ import annotations

import logging
import sys
import time

from alykoti_yellow import config
from alykoti_yellow.modbus_airfi import read_airfi, write_away, write_fan_pct
from alykoti_yellow.device_commands import (
    zigbee_permit_join,
    zigbee_rename,
    zwave_set_node_name,
    zwave_start_inclusion,
    zwave_stop_inclusion,
)
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
from alykoti_yellow.sync import sync_post
from alykoti_yellow.zwave_mqtt import fetch_zwave_devices, set_zwave_device

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("alykoti-yellow")

pending_acks: list[str] = []
cached_integrations: dict = {}
cached_shelly_discovered: list[dict] = []
cached_tasmota_discovered: list[dict] = []


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
            pending_acks.append(cmd_id)
        return ok

    if command == "zwave_start_inclusion":
        ok = zwave_start_inclusion(
            config.MQTT_URL, config.ZWAVE_PREFIX, config.ZWAVE_GATEWAY
        )
        if ok and cmd_id:
            pending_acks.append(cmd_id)
        return ok

    if command == "zwave_stop_inclusion":
        ok = zwave_stop_inclusion(
            config.MQTT_URL, config.ZWAVE_PREFIX, config.ZWAVE_GATEWAY
        )
        if ok and cmd_id:
            pending_acks.append(cmd_id)
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
            pending_acks.append(cmd_id)
        return ok

    if command == "shelly_discover":
        global cached_shelly_discovered
        subnet = payload.get("subnet")
        prefix = subnet if isinstance(subnet, str) and subnet.strip() else None
        cached_shelly_discovered = discover_shelly_devices(prefix)
        if cmd_id:
            pending_acks.append(cmd_id)
        return True

    if command == "shelly_probe":
        host = payload.get("host")
        if not isinstance(host, str):
            return False
        ok = probe_shelly(host) is not None
        if ok and cmd_id:
            pending_acks.append(cmd_id)
        return ok

    if command == "tasmota_discover":
        global cached_tasmota_discovered
        subnet = payload.get("subnet")
        prefix = subnet if isinstance(subnet, str) and subnet.strip() else None
        cached_tasmota_discovered = discover_tasmota_devices(prefix)
        if cmd_id:
            pending_acks.append(cmd_id)
        return True

    if command == "tasmota_probe":
        host = payload.get("host")
        if not isinstance(host, str):
            return False
        ok = probe_tasmota(host) is not None
        if ok and cmd_id:
            pending_acks.append(cmd_id)
        return ok

    if command in ("set_light", "set_device"):
        device_id = payload.get("id")
        on = payload.get("on")
        if not isinstance(device_id, str) or not isinstance(on, bool):
            return False

        ok = False
        if device_id.startswith("zwave:"):
            mqtt_topic = payload.get("mqtt_set_topic")
            if isinstance(mqtt_topic, str):
                ok = set_zwave_device(config.MQTT_URL, mqtt_topic, on)
        elif device_id.startswith("zigbee:"):
            ok = set_light(
                config.MQTT_URL,
                config.MQTT_PREFIX,
                device_id.removeprefix("zigbee:"),
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
            pending_acks.append(cmd_id)
        return ok

    if command == "set_fan_pct" and config.AIRFI_WRITES:
        supply = payload.get("supply_pct")
        exhaust = payload.get("exhaust_pct")
        if isinstance(supply, (int, float)) and isinstance(exhaust, (int, float)):
            ok = write_fan_pct(
                config.AIRFI_SERIAL,
                config.AIRFI_BAUD,
                config.AIRFI_UNIT,
                int(supply),
                int(exhaust),
            )
            if ok and cmd_id:
                pending_acks.append(cmd_id)
            return ok
        return False

    if command == "set_away" and config.AIRFI_WRITES:
        away = payload.get("away")
        if isinstance(away, bool):
            ok = write_away(
                config.AIRFI_SERIAL,
                config.AIRFI_BAUD,
                config.AIRFI_UNIT,
                away,
            )
            if ok and cmd_id:
                pending_acks.append(cmd_id)
            return ok
        return False

    if command == "set_mode":
        if cmd_id:
            pending_acks.append(cmd_id)
        return True

    log.warning("Unknown or blocked command: %s", command)
    return False


def apply_ventilation(response: dict) -> None:
    if not config.AIRFI_WRITES:
        return
    vent = response.get("ventilation")
    if not isinstance(vent, dict):
        return
    supply = vent.get("fan_supply_target")
    exhaust = vent.get("fan_exhaust_target")
    if isinstance(supply, (int, float)) and isinstance(exhaust, (int, float)):
        write_fan_pct(
            config.AIRFI_SERIAL,
            config.AIRFI_BAUD,
            config.AIRFI_UNIT,
            int(supply),
            int(exhaust),
        )


def build_state(
    integrations: dict | None = None,
    shelly_discovered: list[dict] | None = None,
    tasmota_discovered: list[dict] | None = None,
) -> dict:
    state: dict = {}

    if config.AIRFI_ENABLED:
        airfi = read_airfi(config.AIRFI_SERIAL, config.AIRFI_BAUD, config.AIRFI_UNIT)
        state.update(airfi.state)
    else:
        state["airfi_online"] = False

    home_devices: dict[str, dict] = {}

    try:
        home_devices.update(
            fetch_zigbee_home(config.MQTT_URL, config.MQTT_PREFIX, timeout_sec=4.0)
        )
    except Exception as exc:
        log.warning("Zigbee read failed: %s", exc)

    try:
        home_devices.update(
            fetch_zwave_devices(
                config.MQTT_URL,
                config.ZWAVE_PREFIX,
                config.ZWAVE_NODES_JSON,
                timeout_sec=4.0,
            )
        )
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

    return state


def run_loop() -> None:
    global pending_acks, cached_integrations, cached_shelly_discovered, cached_tasmota_discovered

    if not config.DEVICE_TOKEN:
        log.error("ALYKOTI_DEVICE_TOKEN puuttuu — luo hub webissä ja kopioi token .env")
        sys.exit(1)

    log.info(
        "Synkki käynnissä → %s (interval %ss)",
        config.SYNC_URL,
        config.SYNC_INTERVAL_SEC,
    )

    while True:
        acks = pending_acks[:]
        pending_acks = []

        state = build_state(
            cached_integrations,
            cached_shelly_discovered,
            cached_tasmota_discovered,
        )
        response = sync_post(
            config.SYNC_URL,
            config.DEVICE_TOKEN,
            state,
            config.FIRMWARE_VERSION,
            acks,
        )

        if response:
            integrations = response.get("integrations")
            if isinstance(integrations, dict):
                cached_integrations = integrations
            for cmd in response.get("commands") or []:
                execute_command(cmd)
            apply_ventilation(response)
            devices = state.get("home_devices") or {}
            lights = sum(1 for d in devices.values() if d.get("kind") == "light")
            switches = sum(1 for d in devices.values() if d.get("kind") == "switch")
            log.info(
                "Sync OK — devices=%s lights=%s zwave=%s shelly=%s tasmota=%s cmds=%s",
                len(devices),
                lights,
                sum(1 for k in devices if k.startswith("zwave:")),
                sum(1 for k in devices if k.startswith("shelly:")),
                sum(1 for k in devices if k.startswith("tasmota:")),
                len(response.get("commands") or []),
            )
        else:
            log.warning("Sync skipped")

        time.sleep(config.SYNC_INTERVAL_SEC)


def main() -> None:
    run_loop()


if __name__ == "__main__":
    main()
