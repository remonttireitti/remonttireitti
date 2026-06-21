"""Shelly Gen1/Gen2 — discovery, EM metering, switch control."""

from __future__ import annotations

import logging
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Literal

import requests

log = logging.getLogger(__name__)

ShellyRole = Literal["em", "switch"]


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


def _em_status(result: dict[str, Any], channel: int = 0) -> dict[str, Any] | None:
    em = result.get(f"em:{channel}")
    if isinstance(em, dict):
        return em
    if channel == 0 and isinstance(result.get("em:0"), dict):
        return result["em:0"]
    for key, val in result.items():
        if key.startswith("em:") and isinstance(val, dict):
            return val
    return None


def _is_em_model(model: str) -> bool:
    m = model.upper()
    return "SPEM" in m or "SHEM" in m or " PRO EM" in f" {m} " or m.endswith("EM")


def classify_shelly(model: str, status: dict[str, Any] | None = None) -> ShellyRole:
    if status and _em_status(status) is not None:
        return "em"
    if _is_em_model(model):
        return "em"
    return "switch"


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

    status_result: dict[str, Any] | None = None
    status_rpc = _rpc(host, "Shelly.GetStatus", timeout=timeout)
    if status_rpc and isinstance(status_rpc.get("result"), dict):
        status_result = status_rpc["result"]

    rpc = _rpc(host, "Shelly.GetDeviceInfo", timeout=timeout)
    result = rpc.get("result") if rpc else None
    if isinstance(result, dict):
        model = str(result.get("model") or result.get("app") or "Shelly")
        device_id = result.get("id")
        name = str(device_id) if device_id else host
        role = classify_shelly(model, status_result)
        return {
            "host": host,
            "name": name,
            "model": model,
            "gen": 2,
            "role": role,
            "online": True,
        }

    try:
        resp = requests.get(f"http://{host}/status", timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and ("meters" in data or "emeters" in data):
            emeters = data.get("emeters") or data.get("meters") or []
            model = "SHEM"
            if isinstance(emeters, list) and emeters:
                return {
                    "host": host,
                    "name": str(data.get("wifi_sta", {}).get("ssid") or host),
                    "model": model,
                    "gen": 1,
                    "role": "em",
                    "online": True,
                }
    except Exception:
        pass

    try:
        resp = requests.get(f"http://{host}/shelly", timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and data.get("type"):
            model = str(data.get("type"))
            role: ShellyRole = "em" if _is_em_model(model) else "switch"
            return {
                "host": host,
                "name": str(data.get("id") or model or host),
                "model": model,
                "gen": 1,
                "role": role,
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


def _gen1_em_read(host: str) -> dict[str, Any] | None:
    try:
        resp = requests.get(f"http://{host}/status", timeout=2.0)
        resp.raise_for_status()
        data = resp.json()
        emeters = data.get("emeters") if isinstance(data, dict) else None
        if not isinstance(emeters, list) or not emeters:
            return None
        total_power = sum(float(e.get("power") or 0) for e in emeters if isinstance(e, dict))
        total_energy = sum(float(e.get("total") or 0) for e in emeters if isinstance(e, dict))
        return {
            "power_w": total_power,
            "energy_wh": total_energy,
            "em_a_power_w": float(emeters[0].get("power") or 0) if len(emeters) > 0 else None,
            "em_b_power_w": float(emeters[1].get("power") or 0) if len(emeters) > 1 else None,
        }
    except Exception:
        return None


def _device_id(host: str, role: ShellyRole, channel: int) -> str:
    if role == "em":
        return f"shelly:{host}:em"
    return f"shelly:{host}:{channel}"


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
        gen = dev.get("gen", 2)
        model = str(dev.get("model") or "")
        role: ShellyRole = dev.get("role") if dev.get("role") in ("em", "switch") else "switch"
        device_id = dev.get("id") if isinstance(dev.get("id"), str) else _device_id(host, role, channel)

        if gen == 1 and role == "em":
            em = _gen1_em_read(host)
            if not em:
                continue
            out[device_id] = {
                "protocol": "shelly",
                "kind": "sensor",
                "name": name,
                "controllable": False,
                "host": host,
                "channel": channel,
                "role": "em",
                "model": model or None,
                **em,
            }
            continue

        if gen == 1:
            state = _gen1_relay_state(host, channel)
            if state is None:
                continue
            out[device_id] = {
                "protocol": "shelly",
                "kind": "light",
                "name": name,
                "on": state,
                "brightness": None,
                "controllable": True,
                "host": host,
                "channel": channel,
                "role": "switch",
            }
            continue

        rpc = _rpc(host, "Shelly.GetStatus")
        result = rpc.get("result") if rpc else None
        if not isinstance(result, dict):
            continue

        detected_role = classify_shelly(model, result)
        role = role if dev.get("role") in ("em", "switch") else detected_role

        if role == "em" or detected_role == "em":
            em = _em_status(result, 0)
            if not em:
                continue
            a_power = em.get("a_act_power")
            b_power = em.get("b_act_power")
            out[device_id] = {
                "protocol": "shelly",
                "kind": "sensor",
                "name": name,
                "controllable": False,
                "host": host,
                "channel": 0,
                "role": "em",
                "model": model or None,
                "power_w": em.get("total_act_power"),
                "energy_wh": em.get("total_act_energy"),
                "em_a_power_w": a_power if isinstance(a_power, (int, float)) else None,
                "em_b_power_w": b_power if isinstance(b_power, (int, float)) else None,
            }
            continue

        switch = _switch_status(result, channel)
        if not switch:
            continue
        out[device_id] = {
            "protocol": "shelly",
            "kind": "light",
            "name": name,
            "on": switch.get("output") is True,
            "brightness": None,
            "controllable": True,
            "host": host,
            "channel": channel,
            "role": "switch",
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
