"""Shelly Gen1/Gen2 — discovery, status and switch control."""

from __future__ import annotations

import logging
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import requests

log = logging.getLogger(__name__)


def _rpc(host: str, method: str, params: dict[str, Any] | None = None, timeout: float = 3.0) -> dict[str, Any] | None:
    body: dict[str, Any] = {"id": 1, "method": method}
    if params:
        body["params"] = params
    try:
        resp = requests.post(f"http://{host}/rpc", json=body, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and "error" in data:
            log.warning("Shelly RPC error %s: %s", host, data["error"])
            return None
        return data if isinstance(data, dict) else None
    except Exception as exc:
        log.debug("Shelly RPC failed %s %s: %s", host, method, exc)
        return None


def _switch_status(result: dict[str, Any], channel: int) -> dict[str, Any] | None:
    key = f"switch:{channel}"
    switch = result.get(key)
    if isinstance(switch, dict):
        return switch
    if channel == 0 and isinstance(result.get("switch:0"), dict):
        return result["switch:0"]
    return None


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


def probe_shelly(host: str, timeout: float = 1.5) -> dict[str, Any] | None:
    host = host.strip()
    if not host:
        return None

    rpc = _rpc(host, "Shelly.GetDeviceInfo", timeout=timeout)
    result = rpc.get("result") if rpc else None
    if isinstance(result, dict):
        model = result.get("model") or result.get("app") or "Shelly"
        device_id = result.get("id")
        name = str(device_id) if device_id else host
        return {
            "host": host,
            "name": name,
            "model": str(model),
            "gen": 2,
            "online": True,
        }

    try:
        resp = requests.get(f"http://{host}/shelly", timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and data.get("type"):
            return {
                "host": host,
                "name": str(data.get("id") or data.get("type") or host),
                "model": str(data.get("type")),
                "gen": 1,
                "online": True,
            }
    except Exception:
        pass

    return None


def discover_shelly_devices(
    subnet_prefix: str | None = None,
    workers: int = 48,
    timeout: float = 0.8,
) -> list[dict[str, Any]]:
    prefix = subnet_prefix or _local_subnet_prefix()
    found: list[dict[str, Any]] = []
    seen: set[str] = set()

    def check(ip: str) -> dict[str, Any] | None:
        return probe_shelly(ip, timeout=timeout)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(check, f"{prefix}.{host}"): host
            for host in range(1, 255)
        }
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
    log.info("Shelly discovery: %s devices on %s.0/24", len(found), prefix)
    return found


def _gen1_relay_state(host: str, channel: int) -> bool | None:
    try:
        resp = requests.get(f"http://{host}/relay/{channel}", timeout=2.0)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and "ison" in data:
            return data["ison"] is True
    except Exception:
        pass
    return None


def fetch_shelly_devices(configured: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
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
        device_id = dev.get("id") if isinstance(dev.get("id"), str) else f"shelly:{host}:{channel}"
        gen = dev.get("gen", 2)

        on = False
        if gen == 1:
            state = _gen1_relay_state(host, channel)
            if state is None:
                continue
            on = state
        else:
            rpc = _rpc(host, "Shelly.GetStatus")
            result = rpc.get("result") if rpc else None
            if not isinstance(result, dict):
                continue
            switch = _switch_status(result, channel)
            on = switch.get("output") is True if switch else False

        out[device_id] = {
            "protocol": "shelly",
            "kind": "light",
            "name": name,
            "on": on,
            "brightness": None,
            "controllable": True,
            "host": host,
            "channel": channel,
        }
    return out


def set_shelly_switch(host: str, channel: int, on: bool, gen: int = 2) -> bool:
    if gen == 1:
        try:
            resp = requests.get(
                f"http://{host}/relay/{channel}",
                params={"turn": "on" if on else "off"},
                timeout=3.0,
            )
            return resp.ok
        except Exception:
            return False

    rpc = _rpc(host, "Switch.Set", {"id": channel, "on": on})
    return rpc is not None and "error" not in rpc
