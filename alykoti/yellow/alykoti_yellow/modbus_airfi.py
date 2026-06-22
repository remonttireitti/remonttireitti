"""AirFi IV Modbus — TCP (lähiverkko) tai RTU (sarja). Sama rekisterikartta kuin web/src/lib/airfi.ts."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Protocol

from pymodbus.client import ModbusSerialClient, ModbusTcpClient

log = logging.getLogger(__name__)

INPUT = {
    "outdoor_temp": 4,
    "exhaust_temp": 6,
    "exhaust_hru_temp": 7,
    "supply_room_temp": 8,
    "fan_exhaust_pct": 11,
    "fan_supply_pct": 12,
}

HOLDING = {
    "direct_control_enabled": 2,
    "supply_direct_pct": 9,
    "exhaust_direct_pct": 10,
    "away_mode": 11,
    "fireplace": 57,
}


class _ModbusClient(Protocol):
    def connect(self) -> bool: ...
    def close(self) -> None: ...
    def read_input_registers(self, address: int, *, count: int = 1, device_id: int = 1): ...
    def read_holding_registers(self, address: int, *, count: int = 1, device_id: int = 1): ...
    def write_register(self, address: int, value: int, *, device_id: int = 1): ...


@dataclass
class AirfiSnapshot:
    ok: bool
    state: dict[str, Any]


def _signed16(value: int) -> int:
    return value - 65536 if value > 32767 else value


def _parse_temp(raw: int | None) -> float | None:
    if raw is None:
        return None
    v = _signed16(int(raw)) / 10.0
    if v < -50 or v > 80:
        return None
    return round(v, 1)


def _parse_pct(raw: int | None) -> int | None:
    if raw is None:
        return None
    v = int(raw)
    if v < 0 or v > 100:
        return None
    return v


def _open_client(
    *,
    host: str | None,
    port: int,
    serial: str | None,
    baud: int,
) -> _ModbusClient | None:
    if host:
        return ModbusTcpClient(host, port=port, timeout=3)
    if serial:
        return ModbusSerialClient(
            port=serial,
            baudrate=baud,
            bytesize=8,
            parity="N",
            stopbits=1,
            timeout=3,
        )
    return None


def _read_snapshot(client: _ModbusClient, unit: int) -> AirfiSnapshot:
    if not client.connect():
        return AirfiSnapshot(ok=False, state={"airfi_online": False})

    def inp(addr: int) -> int | None:
        rr = client.read_input_registers(addr, count=1, device_id=unit)
        if rr.isError() or not rr.registers:
            return None
        return rr.registers[0]

    def hold(addr: int) -> int | None:
        rr = client.read_holding_registers(addr, count=1, device_id=unit)
        if rr.isError() or not rr.registers:
            return None
        return rr.registers[0]

    outdoor = _parse_temp(inp(INPUT["outdoor_temp"]))
    exhaust = _parse_temp(inp(INPUT["exhaust_temp"]))
    exhaust_hru = _parse_temp(inp(INPUT["exhaust_hru_temp"]))
    supply_room = _parse_temp(inp(INPUT["supply_room_temp"]))
    fan_supply = _parse_pct(inp(INPUT["fan_supply_pct"])) or _parse_pct(
        hold(HOLDING["supply_direct_pct"])
    )
    fan_exhaust = _parse_pct(inp(INPUT["fan_exhaust_pct"])) or _parse_pct(
        hold(HOLDING["exhaust_direct_pct"])
    )

    if outdoor is None and exhaust is None and supply_room is None:
        return AirfiSnapshot(ok=False, state={"airfi_online": False})

    return AirfiSnapshot(
        ok=True,
        state={
            "airfi_online": True,
            "outdoor_temp_c": outdoor,
            "exhaust_temp_c": exhaust,
            "exhaust_hru_temp_c": exhaust_hru,
            "supply_room_temp_c": supply_room,
            "fan_supply_pct": fan_supply,
            "fan_exhaust_pct": fan_exhaust,
            "direct_control": (hold(HOLDING["direct_control_enabled"]) or 0) > 0,
            "away_mode": (hold(HOLDING["away_mode"]) or 0) > 0,
            "fireplace_active": (hold(HOLDING["fireplace"]) or 0) > 0,
        },
    )


def read_airfi_tcp(host: str, port: int, unit: int) -> AirfiSnapshot:
    client = _open_client(host=host, port=port, serial=None, baud=9600)
    if client is None:
        return AirfiSnapshot(ok=False, state={"airfi_online": False})
    try:
        return _read_snapshot(client, unit)
    except Exception as exc:
        log.warning("Modbus TCP read error (%s:%s): %s", host, port, exc)
        return AirfiSnapshot(ok=False, state={"airfi_online": False})
    finally:
        client.close()


def read_airfi_serial(port: str, baud: int, unit: int) -> AirfiSnapshot:
    client = _open_client(host=None, port=502, serial=port, baud=baud)
    if client is None:
        return AirfiSnapshot(ok=False, state={"airfi_online": False})
    try:
        return _read_snapshot(client, unit)
    except Exception as exc:
        log.warning("Modbus serial read error (%s): %s", port, exc)
        return AirfiSnapshot(ok=False, state={"airfi_online": False})
    finally:
        client.close()


def read_airfi(
    *,
    host: str | None = None,
    tcp_port: int = 502,
    serial: str | None = None,
    baud: int = 9600,
    unit: int = 1,
) -> AirfiSnapshot:
    if host:
        return read_airfi_tcp(host, tcp_port, unit)
    if serial:
        return read_airfi_serial(serial, baud, unit)
    log.warning("AirFi: ei host eikä serial — aseta AIRFI_MODBUS_HOST")
    return AirfiSnapshot(ok=False, state={"airfi_online": False})


def _write_with_client(
    client: _ModbusClient,
    unit: int,
    supply: int | None = None,
    exhaust: int | None = None,
    away: bool | None = None,
) -> bool:
    if not client.connect():
        return False
    try:
        if supply is not None and exhaust is not None:
            supply = max(0, min(100, int(supply)))
            exhaust = max(0, min(100, int(exhaust)))
            w1 = client.write_register(HOLDING["direct_control_enabled"], 1, device_id=unit)
            w2 = client.write_register(HOLDING["supply_direct_pct"], supply, device_id=unit)
            w3 = client.write_register(HOLDING["exhaust_direct_pct"], exhaust, device_id=unit)
            return not (w1.isError() or w2.isError() or w3.isError())
        if away is not None:
            w = client.write_register(HOLDING["away_mode"], 1 if away else 0, device_id=unit)
            return not w.isError()
        return False
    except Exception as exc:
        log.warning("Modbus write failed: %s", exc)
        return False
    finally:
        client.close()


def write_fan_pct(
    *,
    host: str | None,
    tcp_port: int,
    serial: str | None,
    baud: int,
    unit: int,
    supply: int,
    exhaust: int,
) -> bool:
    client = _open_client(host=host, port=tcp_port, serial=serial, baud=baud)
    if client is None:
        return False
    return _write_with_client(client, unit, supply=supply, exhaust=exhaust)


def write_away(
    *,
    host: str | None,
    tcp_port: int,
    serial: str | None,
    baud: int,
    unit: int,
    away: bool,
) -> bool:
    client = _open_client(host=host, port=tcp_port, serial=serial, baud=baud)
    if client is None:
        return False
    return _write_with_client(client, unit, away=away)
