"""Shelly Gen1/Gen2 — auto-detect switches, EM, all channels."""

from __future__ import annotations

import logging
import re
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
    switch = result.get(f"switch:{channel}")
    if isinstance(switch, dict):
        return switch
    return None


_EM_POWER_KEY = re.compile(r"^em\d*:\d+$")
_EM_ENERGY_KEY = re.compile(r"^em\d*data:\d+$")


def _em_status_components(result: dict[str, Any]) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """Shelly.GetStatus: teho em/em1:0:sta, energia emdata/em1data:0:sta."""
    power_candidates: list[tuple[int, str, dict[str, Any]]] = []
    energy_candidates: list[tuple[int, str, dict[str, Any]]] = []
    for key, val in result.items():
        if not isinstance(val, dict):
            continue
        if _EM_POWER_KEY.fullmatch(key):
            pri = 0 if key.startswith("em:") else 1
            power_candidates.append((pri, key, val))
        elif _EM_ENERGY_KEY.fullmatch(key):
            pri = 0 if key.startswith("emdata:") else 1
            energy_candidates.append((pri, key, val))
    power = (
        sorted(power_candidates, key=lambda x: (x[0], x[1]))[0][2] if power_candidates else None
    )
    energy = (
        sorted(energy_candidates, key=lambda x: (x[0], x[1]))[0][2] if energy_candidates else None
    )
    return power, energy


def _em_status(result: dict[str, Any]) -> dict[str, Any] | None:
    power, _ = _em_status_components(result)
    return power


def _switch_channels(result: dict[str, Any]) -> list[int]:
    channels: list[int] = []
    for key in result:
        match = re.fullmatch(r"switch:(\d+)", key)
        if match:
            channels.append(int(match.group(1)))
    return sorted(channels)


def _is_em_only_model(model: str) -> bool:
    m = model.upper()
    if any(x in m for x in ("SPSW", "SNSW", "SHSW", "SHPLG", "SPDM", "DIMMER", "PRO 4", "4PM", "4 PRO")):
        return False
    return "SPEM" in m or "SHEM" in m or "3EM" in m or " PRO EM" in f" {m} "


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


def _capabilities(model: str, switches: list[int], em: dict[str, Any] | None) -> list[str]:
    caps: list[str] = []
    if switches:
        caps.append("switch")
    if em and (_is_em_only_model(model) or not switches):
        caps.append("em")
    return caps


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
        configured_name = str(device_id) if device_id else host
        name = _resolve_base_name(host, configured_name, 2, str(device_id) if device_id else None)
        switches = _switch_channels(status_result) if status_result else []
        em = _em_status(status_result) if status_result else None
        return {
            "host": host,
            "name": name,
            "model": model,
            "gen": 2,
            "online": True,
            "switch_channels": len(switches),
            "capabilities": _capabilities(model, switches, em),
        }

    try:
        resp = requests.get(f"http://{host}/status", timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and ("emeters" in data or "meters" in data):
            has_em = isinstance(data.get("emeters"), list) or isinstance(data.get("meters"), list)
            relays = data.get("relays")
            switch_count = len(relays) if isinstance(relays, list) else 0
            return {
                "host": host,
                "name": host,
                "model": "SHEM" if has_em and switch_count == 0 else str(data.get("type") or "Shelly"),
                "gen": 1,
                "online": True,
                "switch_channels": switch_count,
                "capabilities": ["em"] + (["switch"] if switch_count else []),
            }
    except Exception:
        pass

    try:
        resp = requests.get(f"http://{host}/shelly", timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and data.get("type"):
            model = str(data.get("type"))
            relays = data.get("num_relays") or data.get("relays") or []
            switch_count = len(relays) if isinstance(relays, list) else 1
            caps = ["switch"]
            if _is_em_only_model(model):
                caps = ["em"]
            return {
                "host": host,
                "name": str(data.get("id") or model or host),
                "model": model,
                "gen": 1,
                "online": True,
                "switch_channels": switch_count if "switch" in caps else 0,
                "capabilities": caps,
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

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(probe_shelly, f"{prefix}.{n}", timeout): n for n in range(1, 255)}
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
        gen = dev.get("gen", 2)
        model = str(dev.get("model") or "")
        hosts[host] = {"host": host, "name": name, "gen": gen, "model": model}
    return hosts


def _fetch_device_name_gen2(host: str) -> str | None:
    config_rpc = _rpc(host, "Shelly.GetConfig")
    config_result = config_rpc.get("result") if config_rpc else None
    if isinstance(config_result, dict):
        name = config_result.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()
        device_cfg = config_result.get("device")
        if isinstance(device_cfg, dict):
            name = device_cfg.get("name")
            if isinstance(name, str) and name.strip():
                return name.strip()

    sys_rpc = _rpc(host, "Sys.GetConfig")
    sys_result = sys_rpc.get("result") if sys_rpc else None
    if isinstance(sys_result, dict):
        device = sys_result.get("device")
        if isinstance(device, dict):
            name = device.get("name")
            if isinstance(name, str) and name.strip():
                return name.strip()
    return None


def _fetch_switch_name_gen2(host: str, channel: int) -> str | None:
    rpc = _rpc(host, "Switch.GetConfig", {"id": channel})
    result = rpc.get("result") if rpc else None
    if isinstance(result, dict):
        name = result.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()
    return None


def _fetch_device_name_gen1(host: str) -> str | None:
    try:
        resp = requests.get(f"http://{host}/settings", timeout=3.0)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    name = data.get("name")
    if isinstance(name, str) and name.strip():
        return name.strip()
    device = data.get("device")
    if isinstance(device, dict):
        name = device.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()
    return None


def _resolve_base_name(host: str, configured_name: str, gen: int, device_id: str | None = None) -> str:
    """Käytä laitteen omaa nimeä jos käyttäjä ei ole antanut omaa."""
    if configured_name.strip() and configured_name.strip() not in {host, str(device_id or "").strip()}:
        return configured_name.strip()

    if gen == 2:
        fetched = _fetch_device_name_gen2(host)
        if fetched:
            return fetched
    else:
        fetched = _fetch_device_name_gen1(host)
        if fetched:
            return fetched

    if device_id:
        return str(device_id)
    return configured_name.strip() or host


def _channel_name(base: str, channel: int, total: int, switch_name: str | None = None) -> str:
    if switch_name:
        return switch_name
    if total <= 1:
        return base
    return f"{base} kanava {channel + 1}"


def _gen1_add_em_device(
    out: dict[str, dict[str, Any]],
    *,
    host: str,
    name: str,
    model: str,
    meter_rows: list[dict[str, Any]],
) -> None:
    if not meter_rows:
        return
    total_power = sum(float(e.get("power") or 0) for e in meter_rows if isinstance(e, dict))
    total_energy = sum(float(e.get("total") or 0) for e in meter_rows if isinstance(e, dict))
    phases: dict[str, dict[str, Any]] = {}
    phase_letters = ("a", "b", "c")
    for idx, em in enumerate(meter_rows):
        if not isinstance(em, dict) or idx >= len(phase_letters):
            continue
        letter = phase_letters[idx]
        entry: dict[str, Any] = {}
        power = em.get("power")
        if isinstance(power, (int, float)):
            entry["power_w"] = power
            entry["power_kw"] = round(power / 1000.0, 3)
        voltage = em.get("voltage")
        if isinstance(voltage, (int, float)):
            entry["voltage_v"] = voltage
        current = em.get("current")
        if isinstance(current, (int, float)):
            entry["current_a"] = current
        pf = em.get("pf")
        if isinstance(pf, (int, float)):
            entry["pf"] = pf
        if entry:
            phases[letter] = entry
    out[f"shelly:{host}:em"] = {
        "protocol": "shelly",
        "kind": "sensor",
        "name": name,
        "controllable": False,
        "host": host,
        "channel": 0,
        "gen": 1,
        "model": model or None,
        "power_w": total_power,
        "power_kw": round(total_power / 1000.0, 3) if total_power else None,
        "energy_wh": total_energy,
        "em_phases": phases,
        "capabilities": [
            {"id": "energy", "read": True, "write": False},
            {"id": "meter", "read": True, "write": False},
        ],
    }


def _gen1_fetch(host: str, name: str, model: str) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    try:
        resp = requests.get(f"http://{host}/status", timeout=3.0)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return out

    if not isinstance(data, dict):
        return out

    relays = data.get("relays")
    if isinstance(relays, list) and relays:
        for ch, relay in enumerate(relays):
            if not isinstance(relay, dict):
                continue
            out[f"shelly:{host}:{ch}"] = {
                "protocol": "shelly",
                "kind": "switch",
                "name": _channel_name(name, ch, len(relays)),
                "on": relay.get("ison") is True,
                "brightness": None,
                "controllable": True,
                "host": host,
                "channel": ch,
                "gen": 1,
                "capabilities": [
                    {"id": "relay", "read": True, "write": True},
                    {"id": "switch", "read": True, "write": True},
                ],
            }

    emeters = data.get("emeters")
    if isinstance(emeters, list) and emeters:
        em_rows = [e for e in emeters if isinstance(e, dict)]
        _gen1_add_em_device(out, host=host, name=name, model=model, meter_rows=em_rows)
    else:
        meters = data.get("meters")
        if isinstance(meters, list) and meters:
            meter_rows = [e for e in meters if isinstance(e, dict)]
            _gen1_add_em_device(out, host=host, name=name, model=model, meter_rows=meter_rows)

    return out


def _phase_entry(
    power: Any,
    current: Any,
    voltage: Any,
    pf: Any = None,
) -> dict[str, Any] | None:
    if not any(isinstance(v, (int, float)) for v in (power, current, voltage)):
        return None
    entry: dict[str, Any] = {}
    if isinstance(power, (int, float)):
        entry["power_w"] = power
        entry["power_kw"] = round(power / 1000.0, 3)
    if isinstance(current, (int, float)):
        entry["current_a"] = current
    if isinstance(voltage, (int, float)):
        entry["voltage_v"] = voltage
    if isinstance(pf, (int, float)):
        entry["pf"] = pf
    return entry


def _extract_phases(em: dict[str, Any]) -> dict[str, dict[str, Any]]:
    phases: dict[str, dict[str, Any]] = {}
    for letter in ("a", "b", "c"):
        entry = _phase_entry(
            em.get(f"{letter}_act_power"),
            em.get(f"{letter}_current"),
            em.get(f"{letter}_voltage"),
            em.get(f"{letter}_pf"),
        )
        if entry:
            phases[letter] = entry

    if not phases:
        entry = _phase_entry(em.get("act_power"), em.get("current"), em.get("voltage"), em.get("pf"))
        if entry:
            phases["a"] = entry
    return phases


def _extract_energy_wh(energy: dict[str, Any] | None) -> float | None:
    if not energy:
        return None
    for key in ("total_act", "total_act_energy", "total"):
        value = energy.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    total = 0.0
    found = False
    for letter in ("a", "b", "c"):
        for suffix in ("_total_act_energy", "_total_act"):
            value = energy.get(f"{letter}{suffix}")
            if isinstance(value, (int, float)):
                total += float(value)
                found = True
                break
    return total if found else None


def fetch_shelly_devices(configured: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for host, meta in _normalize_hosts(configured).items():
        gen = meta["gen"]
        model = meta["model"]
        device_id: str | None = None

        if gen == 2:
            info_rpc = _rpc(host, "Shelly.GetDeviceInfo")
            info_result = info_rpc.get("result") if info_rpc else None
            if isinstance(info_result, dict) and info_result.get("id"):
                device_id = str(info_result["id"])
        name = _resolve_base_name(host, meta["name"], gen, device_id)

        if gen == 1:
            fetched = _gen1_fetch(host, name, model)
            if fetched:
                out.update(fetched)
                continue

        rpc = _rpc(host, "Shelly.GetStatus")
        result = rpc.get("result") if rpc else None
        if not isinstance(result, dict):
            fetched = _gen1_fetch(host, name, model)
            if fetched:
                out.update(fetched)
            continue

        switches = _switch_channels(result)
        for ch in switches:
            sw = _switch_status(result, ch)
            if not sw:
                continue
            switch_name = _fetch_switch_name_gen2(host, ch) if gen == 2 else None
            out[f"shelly:{host}:{ch}"] = {
                "protocol": "shelly",
                "kind": "switch",
                "name": _channel_name(name, ch, len(switches), switch_name),
                "on": sw.get("output") is True,
                "brightness": None,
                "controllable": True,
                "host": host,
                "channel": ch,
                "gen": 2,
                "model": model or None,
                "capabilities": [
                    {"id": "relay", "read": True, "write": True},
                    {"id": "switch", "read": True, "write": True},
                ],
            }

        em_power, em_energy = _em_status_components(result)
        if em_power or em_energy:
            phases = _extract_phases(em_power) if em_power else {}
            total_power = em_power.get("total_act_power") if em_power else None
            if total_power is None and em_power and isinstance(em_power.get("act_power"), (int, float)):
                total_power = em_power.get("act_power")
            if total_power is None and phases:
                total_power = sum(
                    float(p["power_w"])
                    for p in phases.values()
                    if isinstance(p.get("power_w"), (int, float))
                )
            out[f"shelly:{host}:em"] = {
                "protocol": "shelly",
                "kind": "sensor",
                "name": name,
                "controllable": False,
                "host": host,
                "channel": 0,
                "gen": 2,
                "model": model or None,
                "power_w": total_power,
                "power_kw": (total_power / 1000.0) if isinstance(total_power, (int, float)) else None,
                "energy_wh": _extract_energy_wh(em_energy),
                "em_phases": phases,
                "capabilities": [
                    {"id": "energy", "read": True, "write": False},
                    {"id": "meter", "read": True, "write": False},
                ],
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
