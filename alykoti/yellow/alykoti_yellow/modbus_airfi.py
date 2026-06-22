"""AirFi IV Modbus — TCP (lähiverkko) tai RTU (sarja). Sama rekisterikartta kuin web/src/lib/airfi.ts."""

from __future__ import annotations

import logging
import socket
import time
from dataclasses import dataclass, field
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
    "freezing_alarm": 17,
    "machine_fault": 18,
    "internal_humidity": 22,
    "fan_speed_level": 23,
    "forced_control": 24,
    "direct_control_status": 25,
    "direct_fan_pct": 26,
    "temp_setpoint_read": 27,
    "filter_interval": 30,
    "error_info": 31,
}

HOLDING = {
    "speed_level": 0,
    "emergency_stop": 1,
    "direct_control_enabled": 2,
    "direct_combined_pct": 3,
    "temp_setpoint": 4,
    "supply_direct_pct": 10,
    "exhaust_direct_pct": 11,
    "away_mode": 12,
    "away_temp_setpoint": 51,
    "sauna_mode": 56,
    "fireplace": 57,
}

_MIN_FAN_PCT = 25

_INPUT_CORE_START = INPUT["outdoor_temp"]
_INPUT_CORE_COUNT = INPUT["fan_supply_pct"] - INPUT["outdoor_temp"] + 1
_INPUT_STATUS_START = INPUT["freezing_alarm"]
_INPUT_STATUS_COUNT = INPUT["error_info"] - INPUT["freezing_alarm"] + 1
_HOLDING_BLOCK_START = HOLDING["speed_level"]
_HOLDING_BLOCK_COUNT = HOLDING["away_mode"] - HOLDING["speed_level"] + 1
_HOLDING_EXTRA_START = HOLDING["away_temp_setpoint"]
_HOLDING_EXTRA_COUNT = HOLDING["fireplace"] - HOLDING["away_temp_setpoint"] + 1

AIRFI_ERROR_BITS = [
    ("E0", 1, "Yleishälytys"),
    ("E1", 2, "Koneen puhaltimien ulkopuolinen pysäytys"),
    ("E2", 4, "Ohituspellin toimintahäiriö"),
    ("E3", 8, "Tulopuhallin ei pyöri"),
    ("E4", 16, "Poistopuhallin ei pyöri"),
    ("E5", 32, "Vesipatterin jäätymissuoja"),
    ("E6", 64, "Anturivirhe"),
    ("E7", 128, "Huurtumissuojan painelähetin rikki"),
    ("E8", 256, "Tulo- ja poistopuhaltimen lämpötilat virheellisiä"),
    ("E9", 512, "Vakiopainesäätö-hälytys"),
]


def decode_error_info(raw: int | None) -> list[dict[str, str]]:
    if raw is None:
        return []
    value = int(raw)
    if value <= 0:
        return []
    return [
        {"code": code, "label": label}
        for code, bit, label in AIRFI_ERROR_BITS
        if value & bit
    ]


class _ModbusClient(Protocol):
    socket: socket.socket | None

    def connect(self) -> bool: ...
    def close(self) -> None: ...
    def read_input_registers(self, address: int, *, count: int = 1, device_id: int = 1): ...
    def read_holding_registers(self, address: int, *, count: int = 1, device_id: int = 1): ...
    def write_register(self, address: int, value: int, *, device_id: int = 1): ...


@dataclass
class AirfiSnapshot:
    ok: bool
    state: dict[str, Any]


@dataclass
class AirfiPollState:
    """Backoff kun IV offline — vähentää modeemin kuormitusta."""

    was_online: bool = False
    fail_streak: int = 0
    skip_until: float = field(default_factory=lambda: 0.0)
    offline_backoff_max_sec: float = 180.0
    offline_skip_after: int = 3

    def should_poll(self, now: float | None = None) -> bool:
        return (now or time.monotonic()) >= self.skip_until

    def retry_aggressive(self) -> bool:
        return self.was_online and self.fail_streak <= 3

    def record_result(self, ok: bool, *, now: float | None = None) -> None:
        now = now or time.monotonic()
        if ok:
            self.was_online = True
            self.fail_streak = 0
            self.skip_until = 0.0
            return
        self.fail_streak += 1
        if self.retry_aggressive():
            return
        if self.fail_streak < self.offline_skip_after:
            return
        exp = min(self.fail_streak - self.offline_skip_after, 5)
        delay = min(self.offline_backoff_max_sec, 15 * (2**exp))
        self.skip_until = now + delay
        log.info(
            "AirFi offline — seuraava yritys %.0fs kuluttua (virheet=%s)",
            delay,
            self.fail_streak,
        )


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


def _parse_speed_level(raw: int | None) -> int | None:
    if raw is None:
        return None
    v = int(raw)
    if v < 0 or v > 5:
        return None
    return v


def _enable_tcp_keepalive(sock: socket.socket) -> None:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
    if hasattr(socket, "TCP_KEEPIDLE"):
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 30)
    if hasattr(socket, "TCP_KEEPINTVL"):
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 10)
    if hasattr(socket, "TCP_KEEPCNT"):
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 3)


def _safe_close(client: _ModbusClient | None) -> None:
    if client is None:
        return
    try:
        client.close()
    except Exception:
        pass


def _open_tcp_client(host: str, port: int, *, read_timeout: float) -> ModbusTcpClient:
    # retries=0: ei sisäisiä uudelleenyrityksiä (modeemi jumittuu helposti).
    return ModbusTcpClient(host, port=port, timeout=read_timeout, retries=0)


def _open_serial_client(port: str, baud: int, *, read_timeout: float) -> ModbusSerialClient:
    return ModbusSerialClient(
        port=port,
        baudrate=baud,
        bytesize=8,
        parity="N",
        stopbits=1,
        timeout=read_timeout,
        retries=0,
    )


def _connect_tcp(
    client: ModbusTcpClient,
    *,
    connect_timeout: float,
    read_timeout: float,
) -> bool:
    client.comm_params.timeout_connect = connect_timeout
    try:
        if not client.connect():
            return False
        client.comm_params.timeout_connect = read_timeout
        if client.socket:
            client.socket.settimeout(read_timeout)
            _enable_tcp_keepalive(client.socket)
        return True
    except OSError as exc:
        log.debug("Modbus TCP connect failed: %s", exc)
        return False


def _open_client(
    *,
    host: str | None,
    port: int,
    serial: str | None,
    baud: int,
    read_timeout: float,
) -> _ModbusClient | None:
    if host:
        return _open_tcp_client(host, port, read_timeout=read_timeout)
    if serial:
        return _open_serial_client(serial, baud, read_timeout=read_timeout)
    return None


def _reg(block: list[int] | None, base: int, addr: int) -> int | None:
    if not block:
        return None
    idx = addr - base
    if idx < 0 or idx >= len(block):
        return None
    return block[idx]


def _read_registers(
    client: _ModbusClient,
    unit: int,
    *,
    read_fn,
    address: int,
    count: int,
) -> list[int] | None:
    rr = read_fn(address, count=count, device_id=unit)
    if rr.isError() or not rr.registers:
        return None
    return list(rr.registers)


def probe_tcp(
    host: str,
    port: int,
    unit: int = 1,
    *,
    connect_timeout: float = 3.0,
    read_timeout: float = 3.0,
) -> bool:
    """Nopea TCP + yksi rekisteriluku ennen täyttä snapshotia."""
    client = _open_tcp_client(host, port, read_timeout=read_timeout)
    try:
        if not _connect_tcp(client, connect_timeout=connect_timeout, read_timeout=read_timeout):
            return False
        regs = _read_registers(
            client,
            unit,
            read_fn=client.read_input_registers,
            address=INPUT["outdoor_temp"],
            count=1,
        )
        return regs is not None
    except Exception:
        return False
    finally:
        _safe_close(client)


def _read_snapshot(
    client: _ModbusClient,
    unit: int,
    *,
    connect_timeout: float,
    read_timeout: float,
    is_tcp: bool,
) -> AirfiSnapshot:
    if is_tcp:
        if not _connect_tcp(
            client,
            connect_timeout=connect_timeout,
            read_timeout=read_timeout,
        ):
            return AirfiSnapshot(ok=False, state={"airfi_online": False})
    elif not client.connect():
        return AirfiSnapshot(ok=False, state={"airfi_online": False})

    try:
        inputs_core = _read_registers(
            client,
            unit,
            read_fn=client.read_input_registers,
            address=_INPUT_CORE_START,
            count=_INPUT_CORE_COUNT,
        )
        inputs_status = _read_registers(
            client,
            unit,
            read_fn=client.read_input_registers,
            address=_INPUT_STATUS_START,
            count=_INPUT_STATUS_COUNT,
        )
        holdings = _read_registers(
            client,
            unit,
            read_fn=client.read_holding_registers,
            address=_HOLDING_BLOCK_START,
            count=_HOLDING_BLOCK_COUNT,
        )
        holdings_extra = _read_registers(
            client,
            unit,
            read_fn=client.read_holding_registers,
            address=_HOLDING_EXTRA_START,
            count=_HOLDING_EXTRA_COUNT,
        )
    except Exception as exc:
        log.warning("Modbus read failed: %s", exc)
        _safe_close(client)
        return AirfiSnapshot(ok=False, state={"airfi_online": False})

    outdoor = _parse_temp(_reg(inputs_core, _INPUT_CORE_START, INPUT["outdoor_temp"]))
    exhaust = _parse_temp(_reg(inputs_core, _INPUT_CORE_START, INPUT["exhaust_temp"]))
    exhaust_hru = _parse_temp(_reg(inputs_core, _INPUT_CORE_START, INPUT["exhaust_hru_temp"]))
    supply_room = _parse_temp(_reg(inputs_core, _INPUT_CORE_START, INPUT["supply_room_temp"]))
    fan_supply = _parse_pct(_reg(inputs_core, _INPUT_CORE_START, INPUT["fan_supply_pct"])) or _parse_pct(
        _reg(holdings, _HOLDING_BLOCK_START, HOLDING["supply_direct_pct"])
    )
    fan_exhaust = _parse_pct(_reg(inputs_core, _INPUT_CORE_START, INPUT["fan_exhaust_pct"])) or _parse_pct(
        _reg(holdings, _HOLDING_BLOCK_START, HOLDING["exhaust_direct_pct"])
    )

    error_raw = _reg(inputs_status, _INPUT_STATUS_START, INPUT["error_info"])
    errors = decode_error_info(error_raw)
    emergency_raw = _reg(holdings, _HOLDING_BLOCK_START, HOLDING["emergency_stop"])
    speed_raw = _reg(holdings, _HOLDING_BLOCK_START, HOLDING["speed_level"])
    temp_setpoint_raw = _reg(holdings, _HOLDING_BLOCK_START, HOLDING["temp_setpoint"])
    temp_setpoint_read = _reg(inputs_status, _INPUT_STATUS_START, INPUT["temp_setpoint_read"])
    fan_speed_level = _parse_speed_level(
        _reg(inputs_status, _INPUT_STATUS_START, INPUT["fan_speed_level"])
    )
    if fan_speed_level is None:
        fan_speed_level = _parse_speed_level(speed_raw)

    if outdoor is None and exhaust is None and supply_room is None:
        return AirfiSnapshot(ok=False, state={"airfi_online": False})

    temp_c = _parse_temp(temp_setpoint_read if temp_setpoint_read is not None else temp_setpoint_raw)
    filter_interval = _reg(inputs_status, _INPUT_STATUS_START, INPUT["filter_interval"])
    humidity = _reg(inputs_status, _INPUT_STATUS_START, INPUT["internal_humidity"])

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
            "humidity_pct": humidity if humidity is not None and 0 <= humidity <= 100 else None,
            "direct_control": (_reg(holdings, _HOLDING_BLOCK_START, HOLDING["direct_control_enabled"]) or 0) > 0,
            "away_mode": (_reg(holdings, _HOLDING_BLOCK_START, HOLDING["away_mode"]) or 0) > 0,
            "fireplace_active": (_reg(holdings_extra, _HOLDING_EXTRA_START, HOLDING["fireplace"]) or 0) > 0,
            "freezing_alarm": (_reg(inputs_status, _INPUT_STATUS_START, INPUT["freezing_alarm"]) or 0) > 0,
            "machine_fault": (_reg(inputs_status, _INPUT_STATUS_START, INPUT["machine_fault"]) or 0) > 0,
            "airfi_error_raw": error_raw,
            "airfi_errors": [e["code"] for e in errors],
            "fan_speed_level": fan_speed_level,
            "forced_control": _reg(inputs_status, _INPUT_STATUS_START, INPUT["forced_control"]),
            "temp_setpoint_c": temp_c,
            "filter_change_per_year": filter_interval,
            "sauna_mode": (_reg(holdings_extra, _HOLDING_EXTRA_START, HOLDING["sauna_mode"]) or 0) > 0,
            "emergency_stop": emergency_raw == 1,
            "fault": (
                (_reg(inputs_status, _INPUT_STATUS_START, INPUT["machine_fault"]) or 0) > 0
                or len(errors) > 0
            ),
        },
    )


def _read_with_retries(
    *,
    host: str | None,
    port: int,
    serial: str | None,
    baud: int,
    unit: int,
    connect_timeout: float,
    read_timeout: float,
    retry_count: int,
    retry_delay_sec: float,
) -> AirfiSnapshot:
    is_tcp = bool(host)
    attempts = max(1, retry_count + 1)
    last = AirfiSnapshot(ok=False, state={"airfi_online": False})

    for attempt in range(1, attempts + 1):
        client = _open_client(
            host=host,
            port=port,
            serial=serial,
            baud=baud,
            read_timeout=read_timeout,
        )
        if client is None:
            return last
        try:
            snap = _read_snapshot(
                client,
                unit,
                connect_timeout=connect_timeout,
                read_timeout=read_timeout,
                is_tcp=is_tcp,
            )
            if snap.ok:
                return snap
            last = snap
        except Exception as exc:
            log.warning(
                "Modbus read error (yritys %s/%s): %s",
                attempt,
                attempts,
                exc,
            )
            last = AirfiSnapshot(ok=False, state={"airfi_online": False})
        finally:
            _safe_close(client)

        if attempt < attempts:
            time.sleep(retry_delay_sec)

    return last


def read_airfi_tcp(
    host: str,
    port: int,
    unit: int,
    *,
    connect_timeout: float = 4.0,
    read_timeout: float = 5.0,
    retry_count: int = 0,
    retry_delay_sec: float = 0.5,
) -> AirfiSnapshot:
    return _read_with_retries(
        host=host,
        port=port,
        serial=None,
        baud=9600,
        unit=unit,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        retry_count=retry_count,
        retry_delay_sec=retry_delay_sec,
    )


def read_airfi_serial(
    port: str,
    baud: int,
    unit: int,
    *,
    read_timeout: float = 5.0,
    retry_count: int = 0,
    retry_delay_sec: float = 0.5,
) -> AirfiSnapshot:
    return _read_with_retries(
        host=None,
        port=502,
        serial=port,
        baud=baud,
        unit=unit,
        connect_timeout=read_timeout,
        read_timeout=read_timeout,
        retry_count=retry_count,
        retry_delay_sec=retry_delay_sec,
    )


def read_airfi(
    *,
    host: str | None = None,
    tcp_port: int = 502,
    serial: str | None = None,
    baud: int = 9600,
    unit: int = 1,
    connect_timeout: float = 4.0,
    read_timeout: float = 5.0,
    retry_count: int = 0,
    retry_delay_sec: float = 0.5,
    poll_state: AirfiPollState | None = None,
) -> AirfiSnapshot:
    if poll_state is not None and not poll_state.should_poll():
        return AirfiSnapshot(ok=False, state={"airfi_online": False})

    retries = retry_count
    if poll_state is not None and poll_state.retry_aggressive():
        retries = max(retries, 2)

    if host:
        snap = read_airfi_tcp(
            host,
            tcp_port,
            unit,
            connect_timeout=connect_timeout,
            read_timeout=read_timeout,
            retry_count=retries,
            retry_delay_sec=retry_delay_sec,
        )
    elif serial:
        snap = read_airfi_serial(
            serial,
            baud,
            unit,
            read_timeout=read_timeout,
            retry_count=retries,
            retry_delay_sec=retry_delay_sec,
        )
    else:
        log.warning("AirFi: ei host eikä serial — aseta AIRFI_MODBUS_HOST")
        snap = AirfiSnapshot(ok=False, state={"airfi_online": False})

    if poll_state is not None:
        poll_state.record_result(snap.ok)
    return snap


def _write_with_client(
    client: _ModbusClient,
    unit: int,
    *,
    connect_timeout: float,
    read_timeout: float,
    is_tcp: bool,
    supply: int | None = None,
    exhaust: int | None = None,
    away: bool | None = None,
    temp_setpoint_c: float | None = None,
    sauna_mode: bool | None = None,
) -> bool:
    if is_tcp:
        if not _connect_tcp(
            client,
            connect_timeout=connect_timeout,
            read_timeout=read_timeout,
        ):
            return False
    elif not client.connect():
        return False
    try:
        if supply is not None and exhaust is not None:
            supply = max(_MIN_FAN_PCT, min(100, int(supply)))
            exhaust = max(_MIN_FAN_PCT, min(100, int(exhaust)))
            w1 = client.write_register(HOLDING["direct_control_enabled"], 1, device_id=unit)
            w2 = client.write_register(HOLDING["supply_direct_pct"], supply, device_id=unit)
            w3 = client.write_register(HOLDING["exhaust_direct_pct"], exhaust, device_id=unit)
            e1, e2, e3 = w1.isError(), w2.isError(), w3.isError()
            if e1 or e2 or e3:
                log.warning(
                    "Modbus fan write partial failure: direct=%s supply=%s exhaust=%s",
                    e1,
                    e2,
                    e3,
                )
            return not (e1 or e2 or e3)
        if away is not None:
            w = client.write_register(HOLDING["away_mode"], 1 if away else 0, device_id=unit)
            return not w.isError()
        if temp_setpoint_c is not None:
            raw = max(50, min(260, int(round(float(temp_setpoint_c) * 10))))
            w = client.write_register(HOLDING["temp_setpoint"], raw, device_id=unit)
            return not w.isError()
        if sauna_mode is not None:
            w = client.write_register(HOLDING["sauna_mode"], 1 if sauna_mode else 0, device_id=unit)
            return not w.isError()
        return False
    except Exception as exc:
        log.warning("Modbus write failed: %s", exc)
        return False
    finally:
        _safe_close(client)


def write_fan_pct(
    *,
    host: str | None,
    tcp_port: int,
    serial: str | None,
    baud: int,
    unit: int,
    supply: int,
    exhaust: int,
    connect_timeout: float = 4.0,
    read_timeout: float = 5.0,
) -> bool:
    client = _open_client(
        host=host,
        port=tcp_port,
        serial=serial,
        baud=baud,
        read_timeout=read_timeout,
    )
    if client is None:
        return False
    return _write_with_client(
        client,
        unit,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        is_tcp=bool(host),
        supply=supply,
        exhaust=exhaust,
    )


def write_away(
    *,
    host: str | None,
    tcp_port: int,
    serial: str | None,
    baud: int,
    unit: int,
    away: bool,
    connect_timeout: float = 4.0,
    read_timeout: float = 5.0,
) -> bool:
    client = _open_client(
        host=host,
        port=tcp_port,
        serial=serial,
        baud=baud,
        read_timeout=read_timeout,
    )
    if client is None:
        return False
    return _write_with_client(
        client,
        unit,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        is_tcp=bool(host),
        away=away,
    )


def write_temp_setpoint(
    *,
    host: str | None,
    tcp_port: int,
    serial: str | None,
    baud: int,
    unit: int,
    temp_c: float,
    connect_timeout: float = 4.0,
    read_timeout: float = 5.0,
) -> bool:
    client = _open_client(
        host=host,
        port=tcp_port,
        serial=serial,
        baud=baud,
        read_timeout=read_timeout,
    )
    if client is None:
        return False
    return _write_with_client(
        client,
        unit,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        is_tcp=bool(host),
        temp_setpoint_c=temp_c,
    )


def write_sauna_mode(
    *,
    host: str | None,
    tcp_port: int,
    serial: str | None,
    baud: int,
    unit: int,
    active: bool,
    connect_timeout: float = 4.0,
    read_timeout: float = 5.0,
) -> bool:
    client = _open_client(
        host=host,
        port=tcp_port,
        serial=serial,
        baud=baud,
        read_timeout=read_timeout,
    )
    if client is None:
        return False
    return _write_with_client(
        client,
        unit,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        is_tcp=bool(host),
        sauna_mode=active,
    )
