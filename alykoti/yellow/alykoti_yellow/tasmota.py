"""Tasmota — auto-detect all relay channels."""

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


def _relay_channels_from_sts(sts: dict[str, Any]) -> list[int]:
    channels: list[int] = []
    if "POWER" in sts:
        channels.append(0)
    for i in range(1, 9):
        if f"POWER{i}" in sts:
            channels.append(i)
    return channels


def _detect_channels(host: str, timeout: float = 2.0) -> list[int]:
    data = _cmnd(host, "Status 11", timeout=timeout) or _cmnd(host, "Status 0", timeout=timeout)
    if not data:
        return [0]
    sts = data.get("StatusSTS")
    if isinstance(sts, dict):
        channels = _relay_channels_from_sts(sts)
        if channels:
            return channels
    data = _cmnd(host, "Power", timeout=timeout)
    if data and _power_json_key(0) in data:
        return [0]
    return [0]


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
    channels = _detect_channels(host, timeout=timeout)
    return {
        "host": host,
        "name": str(name),
        "model": str(module),
        "online": True,
        "switch_channels": len(channels),
        "capabilities": ["switch"] if channels else [],
    }


def discover_tasmota_devices(
    subnet_prefix: str | None = None,
    workers: int = 48,
    timeout: float = 0.8,
) -> list[dict[str, Any]]:
    prefix = subnet_prefix or _local_subnet_prefix()
    found: list[dict[str, Any]] = []
    seen: set[str] = set()

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(probe_tasmota, f"{prefix}.{n}", timeout): n for n in range(1, 255)}
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


def _normalize_hosts(configured: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    hosts: dict[str, dict[str, Any]] = {}
    for dev in configured:
        host = dev.get("host")
        if not isinstance(host, str) or not host.strip():
            continue
        host = host.strip()
        if host in hosts:
            continue
        name = dev.get("name") if isinstance(dev.get("name"), str) else host
        model = str(dev.get("model") or "")
        hosts[host] = {"host": host, "name": name, "model": model}
    return hosts


def _channel_name(base: str, channel: int, total: int) -> str:
    if total <= 1:
        return base
    return f"{base} kanava {channel + 1}"


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
    for host, meta in _normalize_hosts(configured).items():
        name = meta["name"]
        channels = _detect_channels(host)
        for ch in channels:
            on = _read_power(host, ch)
            if on is None:
                continue
            out[f"tasmota:{host}:{ch}"] = {
                "protocol": "tasmota",
                "kind": "switch",
                "name": _channel_name(name, ch, len(channels)),
                "on": on,
                "brightness": None,
                "controllable": True,
                "host": host,
                "channel": ch,
                "model": meta["model"] or None,
                "capabilities": [
                    {"id": "relay", "read": True, "write": True},
                    {"id": "switch", "read": True, "write": True},
                ],
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
