"""Tasmota (Sonoff ym.) — HTTP discovery, status and relay control."""

from __future__ import annotations

import logging
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import requests

log = logging.getLogger(__name__)


def _local_subnet_prefix() -> str:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        parts = ip.split(".")
        if len(parts) == 4:
            return ".".join(parts[:3])
    except Exception:
        pass
    return "192.168.50"


def _power_cmnd(channel: int) -> str:
    return "Power" if channel == 0 else f"Power{channel}"


def _power_json_key(channel: int) -> str:
    return "POWER" if channel == 0 else f"POWER{channel}"


def _cmnd(host: str, command: str, timeout: float = 2.0) -> dict[str, Any] | None:
    try:
        resp = requests.get(
            f"http://{host}/cm",
            params={"cmnd": command},
            timeout=timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, dict) else None
    except Exception as exc:
        log.debug("Tasmota cmnd failed %s %s: %s", host, command, exc)
        return None


def probe_tasmota(host: str, timeout: float = 1.5) -> dict[str, Any] | None:
    host = host.strip()
    if not host:
        return None

    data = _cmnd(host, "Status 0", timeout=timeout)
    if not data:
        return None

    status = data.get("Status")
    if not isinstance(status, dict):
        return None

    name = status.get("FriendlyName") or status.get("Hostname") or host
    module = status.get("Module") or status.get("DeviceName") or "Tasmota"
    return {
        "host": host,
        "name": str(name),
        "model": str(module),
        "online": True,
    }


def discover_tasmota_devices(
    subnet_prefix: str | None = None,
    workers: int = 48,
    timeout: float = 0.8,
) -> list[dict[str, Any]]:
    prefix = subnet_prefix or _local_subnet_prefix()
    found: list[dict[str, Any]] = []
    seen: set[str] = set()

    def check(ip: str) -> dict[str, Any] | None:
        return probe_tasmota(ip, timeout=timeout)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(check, f"{prefix}.{n}"): n for n in range(1, 255)}
        for future in as_completed(futures):
            try:
                item = future.result()
            except Exception:
                continue
            if not item or item["host"] in seen:
                continue
            seen.add(item["host"])
            found.append(item)

    found.sort(key=lambda d: d["host"])
    log.info("Tasmota discovery: %s devices on %s.0/24", len(found), prefix)
    return found


def _read_power(host: str, channel: int) -> bool | None:
    data = _cmnd(host, _power_cmnd(channel))
    if not data:
        return None
    key = _power_json_key(channel)
    val = data.get(key)
    if isinstance(val, str):
        return val.upper() in ("ON", "1")
    sts = data.get("StatusSTS")
    if isinstance(sts, dict):
        val = sts.get(key)
        if isinstance(val, str):
            return val.upper() in ("ON", "1")
    return None


def fetch_tasmota_devices(configured: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for dev in configured:
        host = dev.get("host")
        if not isinstance(host, str) or not host.strip():
            continue
        host = host.strip()
        channel = dev.get("channel", 0)
        if not isinstance(channel, int):
            channel = 0
        name = dev.get("name") if isinstance(dev.get("name"), str) else host
        device_id = dev.get("id") if isinstance(dev.get("id"), str) else f"tasmota:{host}:{channel}"

        on = _read_power(host, channel)
        if on is None:
            continue

        out[device_id] = {
            "protocol": "tasmota",
            "kind": "light",
            "name": name,
            "on": on,
            "brightness": None,
            "controllable": True,
            "host": host,
            "channel": channel,
        }
    return out


def set_tasmota_power(host: str, channel: int, on: bool) -> bool:
    cmnd = _power_cmnd(channel)
    state = "On" if on else "Off"
    data = _cmnd(host, f"{cmnd} {state}", timeout=3.0)
    if not data:
        return False
    key = _power_json_key(channel)
    val = data.get(key)
    if isinstance(val, str):
        return (val.upper() in ("ON", "1")) == on
    return True
