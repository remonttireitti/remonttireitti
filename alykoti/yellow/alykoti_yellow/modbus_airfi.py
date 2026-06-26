"""AirFi IV Modbus — TCP (lähiverkko) tai RTU (sarja). Sama rekisterikartta kuin web/src/lib/airfi.ts."""

from __future__ import annotations

import logging
import os
import socket
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol

from pymodbus.client import ModbusSerialClient, ModbusTcpClient

log = logging.getLogger(__name__)

# Kuittauksen jälkeen ei Modbus-tuuletuskirjoituksia — estää E1/hätäseis -kierteen.
_ack_until_wall: float = 0.0
ACK_COOLDOWN_SEC = 1800.0


def _cooldown_file() -> Path:
    return Path(
        os.environ.get(
            "AIRFI_ACK_COOLDOWN_FILE",
            "/home/ek/alykoti-yellow/.airfi_ack_until",
        )
    )


def _sync_cooldown_from_disk() -> None:
    global _ack_until_wall
    try:
        path = _cooldown_file()
        if path.is_file():
            _ack_until_wall = max(_ack_until_wall, float(path.read_text().strip()))
    except Exception as exc:
        log.debug("AirFi cooldown read: %s", exc)


def mark_airfi_ack_cooldown(seconds: float = ACK_COOLDOWN_SEC) -> None:
    global _ack_until_wall
    _sync_cooldown_from_disk()
    _ack_until_wall = max(_ack_until_wall, time.time() + max(0.0, seconds))
    try:
        _cooldown_file().write_text(f"{_ack_until_wall:.0f}")
    except Exception as exc:
        log.warning("AirFi cooldown write: %s", exc)
    log.info("AirFi Modbus-kirjoitustauko %.0fs (kuittaus)", seconds)


def clear_airfi_ack_cooldown() -> None:
    global _ack_until_wall
    _ack_until_wall = 0.0
    try:
        path = _cooldown_file()
        if path.is_file():
            path.unlink()
    except Exception as exc:
        log.debug("AirFi cooldown clear: %s", exc)


def airfi_ack_cooldown_active() -> bool:
    _sync_cooldown_from_disk()
    return time.time() < _ack_until_wall


def airfi_writes_pause_until_iso() -> str | None:
    _sync_cooldown_from_disk()
    if time.time() >= _ack_until_wall:
        return None
    return datetime.fromtimestamp(_ack_until_wall, tz=timezone.utc).isoformat()


_sync_cooldown_from_disk()

_modbus_lock = threading.RLock()
_last_modbus_at: float = 0.0
# HA: message_wait_milliseconds=30 TCP:lle, delay=1s ensimmäiseen viestiin yhdistämisen jälkeen.
MODBUS_TCP_GAP_SEC = float(os.environ.get("AIRFI_MODBUS_TCP_GAP_MS", "30")) / 1000.0
MODBUS_SERIAL_GAP_SEC = float(os.environ.get("AIRFI_MODBUS_DELAY_SEC", "3"))
MODBUS_CONNECT_DELAY_SEC = float(os.environ.get("AIRFI_MODBUS_CONNECT_DELAY_SEC", "1"))
MODBUS_CONNECT_GAP_SEC = float(os.environ.get("AIRFI_MODBUS_CONNECT_GAP_SEC", "2"))
MODBUS_TCP_RETRIES = max(0, int(os.environ.get("AIRFI_MODBUS_RETRIES", "3")))


@dataclass
class _TcpPersistent:
    client: ModbusTcpClient | None = None
    host: str | None = None
    port: int | None = None


_tcp_persistent = _TcpPersistent()
_last_tcp_drop_at: float = 0.0
_tcp_read_fail_streak: int = 0
_TCP_DROP_AFTER_FAILS = 3


def _modbus_pause_locked(*, is_tcp: bool = False) -> None:
    """Kutsu vain kun _modbus_lock on jo pidossa."""
    global _last_modbus_at
    gap_sec = MODBUS_TCP_GAP_SEC if is_tcp else MODBUS_SERIAL_GAP_SEC
    now = time.monotonic()
    wait = gap_sec - (now - _last_modbus_at)
    if wait > 0:
        time.sleep(wait)
    _last_modbus_at = time.monotonic()


def _modbus_pause(*, is_tcp: bool = False) -> None:
    with _modbus_lock:
        _modbus_pause_locked(is_tcp=is_tcp)


def _socket_alive(sock: socket.socket) -> bool:
    try:
        sock.setblocking(False)
        try:
            if sock.recv(1, socket.MSG_PEEK | socket.MSG_DONTWAIT) == b"":
                return False
        except BlockingIOError:
            pass
        except OSError:
            return False
        finally:
            sock.setblocking(True)
        return True
    except OSError:
        return False


def _drop_tcp_client() -> None:
    """Sulje TCP-yhteys — käytä vain kun yhteys on oikeasti rikki."""
    global _last_tcp_drop_at, _tcp_read_fail_streak
    if _tcp_persistent.client is not None:
        _safe_close(_tcp_persistent.client)
    _tcp_persistent.client = None
    _tcp_persistent.host = None
    _tcp_persistent.port = None
    _last_tcp_drop_at = time.monotonic()
    _tcp_read_fail_streak = 0


def _note_tcp_read_failure() -> None:
    """HA close_comm_on_error:false — älä katkaise heti, vain toistuvista virheistä."""
    global _tcp_read_fail_streak
    _tcp_read_fail_streak += 1
    if _tcp_read_fail_streak >= _TCP_DROP_AFTER_FAILS:
        log.info("Modbus TCP: %s peräkkäistä lukuvirhettä — uusi yhteys", _tcp_read_fail_streak)
        _drop_tcp_client()


def _note_tcp_read_success() -> None:
    global _tcp_read_fail_streak
    _tcp_read_fail_streak = 0


def _acquire_tcp_client(
    host: str,
    port: int,
    *,
    connect_timeout: float,
    read_timeout: float,
) -> ModbusTcpClient | None:
    """Pidä Modbus TCP auki — sama malli kuin Guition ESP modbus_tcp_manager."""
    global _last_tcp_drop_at
    p = _tcp_persistent
    if (
        p.client is not None
        and p.host == host
        and p.port == port
        and p.client.socket is not None
        and _socket_alive(p.client.socket)
    ):
        return p.client

    _drop_tcp_client()
    gap = MODBUS_CONNECT_GAP_SEC - (time.monotonic() - _last_tcp_drop_at)
    if gap > 0:
        time.sleep(gap)

    client = _open_tcp_client(host, port, read_timeout=read_timeout)
    if not _connect_tcp(
        client,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        connect_attempts=MODBUS_TCP_RETRIES,
    ):
        _safe_close(client)
        _last_tcp_drop_at = time.monotonic()
        return None

    if MODBUS_CONNECT_DELAY_SEC > 0:
        time.sleep(MODBUS_CONNECT_DELAY_SEC)

    p.client = client
    p.host = host
    p.port = port
    return client


INPUT = {
    "outdoor_temp": 4,
    "exhaust_temp": 6,
    "exhaust_hru_temp": 7,
    "supply_room_temp": 8,
    "fan_exhaust_pct": 11,
    "fan_supply_pct": 12,
    "fireplace_status": 15,
    "emergency_stop_status": 17,
    "freezing_alarm": 18,
    "machine_fault": 19,
    "internal_humidity": 23,
    "fan_speed_level": 24,
    "forced_control": 25,
    "direct_control_status": 26,
    "direct_fan_pct": 27,
    "temp_setpoint_read": 28,
    "filter_interval": 31,
    "error_info": 32,
    "aux2_status": 37,  # 3x00038 AUX2 — LTO ohituspelti (tehdas: ulkoilmapellin rele)
    "hood_flap_open": 40,
    "supply_airflow_m3h": 45,
    "exhaust_airflow_m3h": 46,
}

HOLDING = {
    "speed_level": 0,
    "emergency_stop": 1,
    "direct_control_enabled": 2,
    "direct_combined_pct": 3,
    "temp_setpoint": 4,
    "constant_pressure_mode": 8,
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
_INPUT_STATUS_START = INPUT["emergency_stop_status"]
_INPUT_STATUS_COUNT = INPUT["error_info"] - INPUT["emergency_stop_status"] + 1
_INPUT_EXTENDED_START = INPUT["error_info"] + 1
_INPUT_EXTENDED_COUNT = INPUT["aux2_status"] - _INPUT_EXTENDED_START + 1
# h0 (nopeus) ei ole luettavissa kaikilla laiteversioilla — blokkiluku osoitteesta 0 epäonnistuu.
_HOLDING_BLOCK_START = HOLDING["emergency_stop"]
_HOLDING_BLOCK_COUNT = HOLDING["away_mode"] - HOLDING["emergency_stop"] + 1
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

    def reset(self) -> None:
        self.fail_streak = 0
        self.skip_until = 0.0

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
    return ModbusTcpClient(
        host,
        port=port,
        timeout=read_timeout,
        retries=MODBUS_TCP_RETRIES,
    )


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
    connect_attempts: int = 3,
) -> bool:
    client.comm_params.timeout_connect = connect_timeout
    for attempt in range(1, max(1, connect_attempts) + 1):
        try:
            if client.connect():
                client.comm_params.timeout_connect = read_timeout
                if client.socket:
                    client.socket.settimeout(read_timeout)
                    _enable_tcp_keepalive(client.socket)
                return True
        except OSError as exc:
            log.debug("Modbus TCP connect failed (%s/%s): %s", attempt, connect_attempts, exc)
        if attempt < connect_attempts:
            time.sleep(3.0)
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
    retries: int = MODBUS_TCP_RETRIES,
) -> list[int] | None:
    last_exc: Exception | None = None
    for attempt in range(1, max(1, retries) + 1):
        try:
            rr = read_fn(address, count=count, device_id=unit)
            if not rr.isError() and rr.registers:
                return list(rr.registers)
        except Exception as exc:
            last_exc = exc
        if attempt < retries:
            time.sleep(MODBUS_TCP_GAP_SEC)
    if last_exc is not None:
        log.debug("Modbus read reg %s count %s failed: %s", address, count, last_exc)
    return None


def probe_tcp(
    host: str,
    port: int,
    unit: int = 1,
    *,
    connect_timeout: float = 3.0,
    read_timeout: float = 3.0,
) -> bool:
    """Nopea TCP + yksi rekisteriluku ennen täyttä snapshotia."""
    with _modbus_lock:
        _modbus_pause_locked(is_tcp=True)
        client = _acquire_tcp_client(
            host,
            port,
            connect_timeout=connect_timeout,
            read_timeout=read_timeout,
        )
        if client is None:
            return False
        try:
            regs = _read_registers(
                client,
                unit,
                read_fn=client.read_input_registers,
                address=INPUT["outdoor_temp"],
                count=1,
            )
            return regs is not None
        except Exception:
            _note_tcp_read_failure()
            return False


def _read_snapshot(
    client: _ModbusClient,
    unit: int,
    *,
    connect_timeout: float,
    read_timeout: float,
    is_tcp: bool,
    already_connected: bool = False,
) -> AirfiSnapshot:
    if is_tcp:
        if not already_connected and not _connect_tcp(
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
        inputs_extended = _read_registers(
            client,
            unit,
            read_fn=client.read_input_registers,
            address=_INPUT_EXTENDED_START,
            count=_INPUT_EXTENDED_COUNT,
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
        if is_tcp:
            _note_tcp_read_failure()
        else:
            _safe_close(client)
        return AirfiSnapshot(ok=False, state={"airfi_online": False})

    if is_tcp:
        _note_tcp_read_success()

    outdoor = _parse_temp(_reg(inputs_core, _INPUT_CORE_START, INPUT["outdoor_temp"]))
    exhaust = _parse_temp(_reg(inputs_core, _INPUT_CORE_START, INPUT["exhaust_temp"]))
    exhaust_hru = _parse_temp(_reg(inputs_core, _INPUT_CORE_START, INPUT["exhaust_hru_temp"]))
    supply_room = _parse_temp(_reg(inputs_core, _INPUT_CORE_START, INPUT["supply_room_temp"]))
    # Toteutunut nopeus = input (3x00012/13). Holding h10/h11 = viimeisin kirjoitus, ei aina sama.
    fan_supply = _parse_pct(_reg(inputs_core, _INPUT_CORE_START, INPUT["fan_supply_pct"]))
    fan_exhaust = _parse_pct(_reg(inputs_core, _INPUT_CORE_START, INPUT["fan_exhaust_pct"]))
    if fan_supply is None:
        fan_supply = _parse_pct(_reg(holdings, _HOLDING_BLOCK_START, HOLDING["supply_direct_pct"]))
    if fan_exhaust is None:
        fan_exhaust = _parse_pct(_reg(holdings, _HOLDING_BLOCK_START, HOLDING["exhaust_direct_pct"]))

    error_raw = _reg(inputs_status, _INPUT_STATUS_START, INPUT["error_info"])
    errors = decode_error_info(error_raw)
    emergency_holding = _reg(holdings, _HOLDING_BLOCK_START, HOLDING["emergency_stop"])
    emergency_input = _reg(inputs_status, _INPUT_STATUS_START, INPUT["emergency_stop_status"])
    speed_raw = None
    speed_block = _read_registers(
        client,
        unit,
        read_fn=client.read_holding_registers,
        address=HOLDING["speed_level"],
        count=1,
    )
    speed_raw = _reg(speed_block, HOLDING["speed_level"], HOLDING["speed_level"])
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

    state: dict[str, Any] = {
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
        "lto_bypass_on": (_reg(inputs_extended, _INPUT_EXTENDED_START, INPUT["aux2_status"]) or 0) > 0,
        # 3x00017 = todellinen hätäseis-tila. 4x00002 (h1) on kirjoitusrekisteri — älä käytä statusnäyttöön.
        "emergency_stop": (emergency_input or 0) > 0,
        "fault": (
            (_reg(inputs_status, _INPUT_STATUS_START, INPUT["machine_fault"]) or 0) > 0
            or len(errors) > 0
        ),
    }
    if airfi_ack_cooldown_active() and not airfi_machine_blocks_ventilation(state):
        clear_airfi_ack_cooldown()
        log.info("AirFi kuittauksen tauko poistettu — kone ok")

    return AirfiSnapshot(ok=True, state=state)


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

    with _modbus_lock:
        for attempt in range(1, attempts + 1):
            _modbus_pause_locked(is_tcp=is_tcp)
            if is_tcp:
                client = _acquire_tcp_client(
                    host,
                    port,
                    connect_timeout=connect_timeout,
                    read_timeout=read_timeout,
                )
                if client is None:
                    if attempt < attempts:
                        time.sleep(retry_delay_sec)
                    continue
                try:
                    snap = _read_snapshot(
                        client,
                        unit,
                        connect_timeout=connect_timeout,
                        read_timeout=read_timeout,
                        is_tcp=True,
                        already_connected=True,
                    )
                    if snap.ok:
                        return snap
                    last = snap
                    if is_tcp:
                        _note_tcp_read_failure()
                except Exception as exc:
                    log.warning(
                        "Modbus read error (yritys %s/%s): %s",
                        attempt,
                        attempts,
                        exc,
                    )
                    last = AirfiSnapshot(ok=False, state={"airfi_online": False})
                    if is_tcp:
                        _note_tcp_read_failure()
            else:
                client = _open_client(
                    host=None,
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
                        is_tcp=False,
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


def _airfi_transport_paths(
    host: str | None,
    serial: str | None,
) -> list[tuple[str | None, str | None]]:
    """Järjestys: TCP ensin jos molemmat, muuten mikä on konfiguroitu."""
    if host and serial:
        return [(host, None), (None, serial)]
    if host:
        return [(host, None)]
    if serial:
        return [(None, serial)]
    return []


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
    force_poll: bool = False,
) -> AirfiSnapshot:
    if poll_state is not None and not force_poll and not poll_state.should_poll():
        return AirfiSnapshot(ok=False, state={"airfi_online": False})

    retries = retry_count
    if poll_state is not None and poll_state.retry_aggressive():
        retries = max(retries, 2)

    paths = _airfi_transport_paths(host, serial)
    if not paths:
        log.warning("AirFi: ei host eikä serial — aseta AIRFI_MODBUS_HOST tai AIRFI_MODBUS_SERIAL")
        snap = AirfiSnapshot(ok=False, state={"airfi_online": False})
        if poll_state is not None:
            poll_state.record_result(False)
        return snap

    snap = AirfiSnapshot(ok=False, state={"airfi_online": False})
    for path_host, path_serial in paths:
        label = (
            f"TCP {path_host}:{tcp_port}"
            if path_host
            else f"RTU {path_serial}@{baud}"
        )
        log.info("AirFi read: %s", label)
        if path_host:
            snap = read_airfi_tcp(
                path_host,
                tcp_port,
                unit,
                connect_timeout=connect_timeout,
                read_timeout=read_timeout,
                retry_count=retries,
                retry_delay_sec=retry_delay_sec,
            )
        else:
            snap = read_airfi_serial(
                path_serial,
                baud,
                unit,
                read_timeout=read_timeout,
                retry_count=retries,
                retry_delay_sec=retry_delay_sec,
            )
        if snap.ok:
            log.info("AirFi read OK (%s)", label)
            break
        log.warning("AirFi read epäonnistui (%s)", label)

    if poll_state is not None:
        poll_state.record_result(snap.ok)
    return snap


def _read_write_guard(
    client: _ModbusClient,
    unit: int,
) -> tuple[bool, dict[str, Any]]:
    """Kevyt luku ennen kirjoitusta — vain tuuletus estot ja nykyiset fanit."""
    fans = _read_registers(
        client,
        unit,
        read_fn=client.read_input_registers,
        address=INPUT["fan_exhaust_pct"],
        count=2,
    )
    status = _read_registers(
        client,
        unit,
        read_fn=client.read_input_registers,
        address=INPUT["emergency_stop_status"],
        count=INPUT["error_info"] - INPUT["emergency_stop_status"] + 1,
    )
    if not fans or not status:
        return False, {"airfi_online": False}
    base = INPUT["emergency_stop_status"]
    error_raw = _reg(status, base, INPUT["error_info"])
    state: dict[str, Any] = {
        "airfi_online": True,
        "fan_supply_pct": _parse_pct(fans[1]),
        "fan_exhaust_pct": _parse_pct(fans[0]),
        "emergency_stop": (_reg(status, base, INPUT["emergency_stop_status"]) or 0) > 0,
        "machine_fault": (_reg(status, base, INPUT["machine_fault"]) or 0) > 0,
        "freezing_alarm": (_reg(status, base, INPUT["freezing_alarm"]) or 0) > 0,
        "airfi_error_raw": error_raw,
        "airfi_errors": [e["code"] for e in decode_error_info(error_raw)],
    }
    return True, state


def _verify_fan_write(
    client: _ModbusClient,
    unit: int,
    supply: int,
    exhaust: int,
) -> tuple[bool, dict[str, Any]]:
    """Kevyt vahvistus samalla yhteydellä — ei täyttä snapshotia."""
    fans = _read_registers(
        client,
        unit,
        read_fn=client.read_input_registers,
        address=INPUT["fan_exhaust_pct"],
        count=2,
    )
    status = _read_registers(
        client,
        unit,
        read_fn=client.read_input_registers,
        address=INPUT["emergency_stop_status"],
        count=INPUT["error_info"] - INPUT["emergency_stop_status"] + 1,
    )
    if not fans or not status:
        return False, {"airfi_online": False}
    fan_exhaust = _parse_pct(fans[0])
    fan_supply = _parse_pct(fans[1])
    emergency = _reg(status, INPUT["emergency_stop_status"], INPUT["emergency_stop_status"])
    error_raw = _reg(status, INPUT["emergency_stop_status"], INPUT["error_info"])
    state: dict[str, Any] = {
        "airfi_online": True,
        "fan_supply_pct": fan_supply,
        "fan_exhaust_pct": fan_exhaust,
        "emergency_stop": (emergency or 0) > 0,
        "airfi_error_raw": error_raw,
        "airfi_errors": [e["code"] for e in decode_error_info(error_raw)],
    }
    ok = (
        _fans_near_target(state, supply, exhaust)
        and not airfi_machine_blocks_ventilation(state)
    )
    return ok, state


def _fans_near_target(
    state: dict[str, Any],
    supply: int,
    exhaust: int,
    *,
    tolerance: int = 3,
) -> bool:
    fs = state.get("fan_supply_pct")
    fe = state.get("fan_exhaust_pct")
    if not isinstance(fs, (int, float)) or not isinstance(fe, (int, float)):
        return False
    return abs(int(fs) - supply) <= tolerance and abs(int(fe) - exhaust) <= tolerance


def _rollback_tcp_direct(client: _ModbusClient, unit: int) -> None:
    for addr, val in (
        (HOLDING["direct_control_enabled"], 0),
        (HOLDING["direct_combined_pct"], 0),
    ):
        w = client.write_register(addr, val, device_id=unit)
        if w.isError():
            log.warning("Modbus rollback failed reg %s", addr)


def _write_fan_registers(
    client: _ModbusClient,
    unit: int,
    supply: int,
    exhaust: int,
    *,
    known_state: dict[str, Any] | None,
    is_tcp: bool,
) -> bool:
    """Kirjoita tuuletinnopeudet — client on jo yhdistetty, ei suljeta täällä."""
    supply = max(_MIN_FAN_PCT, min(100, int(supply)))
    exhaust = max(_MIN_FAN_PCT, min(100, int(exhaust)))
    if is_tcp:
        # TCP-silta: h2=1 laukaisee usein E1/hätäseisin. h8=1 + h10/h11 toimii (testattu Pi:llä).
        w2 = client.write_register(HOLDING["direct_control_enabled"], 0, device_id=unit)
        if w2.isError():
            log.warning("Modbus h2=0 write failed")
            return False
        w8 = client.write_register(HOLDING["constant_pressure_mode"], 1, device_id=unit)
        if w8.isError():
            log.warning("Modbus h8=1 write failed")
            return False
        time.sleep(1.0)
        w10 = client.write_register(HOLDING["supply_direct_pct"], supply, device_id=unit)
        w11 = client.write_register(HOLDING["exhaust_direct_pct"], exhaust, device_id=unit)
        if w10.isError() or w11.isError():
            log.warning("Modbus h10/h11 write failed")
            return False
        time.sleep(10.0)
        return True

    # RS485 / ESP-hub: suoraohjaus h2=1 + h10/h11
    prep = [
        (HOLDING["constant_pressure_mode"], 0),
        (HOLDING["emergency_stop"], 0),
        (HOLDING["away_mode"], 0),
    ]
    for addr, val in prep:
        w = client.write_register(addr, val, device_id=unit)
        if w.isError():
            log.warning("Modbus fan prep failed reg %s", addr)
    for addr, val in (
        (HOLDING["direct_combined_pct"], 0),
        (HOLDING["supply_direct_pct"], 0),
        (HOLDING["exhaust_direct_pct"], 0),
    ):
        w = client.write_register(addr, val, device_id=unit)
        if w.isError():
            log.warning("Modbus fan prep failed reg %s", addr)
    w2 = client.write_register(HOLDING["direct_control_enabled"], 1, device_id=unit)
    w10 = client.write_register(HOLDING["supply_direct_pct"], supply, device_id=unit)
    w11 = client.write_register(HOLDING["exhaust_direct_pct"], exhaust, device_id=unit)
    e2, e10, e11 = w2.isError(), w10.isError(), w11.isError()
    if e2 or e10 or e11:
        log.warning(
            "Modbus fan write partial failure: h2=%s supply=%s exhaust=%s",
            e2,
            e10,
            e11,
        )
        if not e2:
            w_off = client.write_register(HOLDING["direct_control_enabled"], 0, device_id=unit)
            if w_off.isError():
                log.warning("Modbus fan rollback h2=0 failed")
    return not (e2 or e10 or e11)


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
    known_state: dict[str, Any] | None = None,
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
            return _write_fan_registers(
                client,
                unit,
                supply,
                exhaust,
                known_state=known_state,
                is_tcp=is_tcp,
            )
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
    known_state: dict[str, Any] | None = None,
    retry_count: int = 5,
    retry_delay_sec: float = 10.0,
) -> bool:
    """Lue + kirjoita yhdellä Modbus-istunnolla. Kokeilee TCP:n jälkeen sarjaa jos molemmat."""
    paths = _airfi_transport_paths(host, serial)
    if not paths:
        log.warning("write_fan_pct: ei host eikä serial")
        return False

    attempts = max(1, retry_count + 1)
    with _modbus_lock:
        for path_host, path_serial in paths:
            is_tcp = bool(path_host)
            path_read_timeout = max(read_timeout, 12.0) if is_tcp else read_timeout
            path_connect_timeout = max(connect_timeout, 6.0) if is_tcp else connect_timeout
            path_label = (
                f"{path_host}:{tcp_port}" if is_tcp else f"{path_serial}@{baud}"
            )
            for attempt in range(1, attempts + 1):
                _modbus_pause_locked(is_tcp=is_tcp)
                serial_client: _ModbusClient | None = None
                try:
                    if is_tcp:
                        client = _acquire_tcp_client(
                            path_host,
                            tcp_port,
                            connect_timeout=path_connect_timeout,
                            read_timeout=path_read_timeout,
                        )
                        if client is None:
                            if attempt < attempts:
                                log.info(
                                    "write_fan_pct yhteys epäonnistui %s (%s/%s)",
                                    path_label,
                                    attempt,
                                    attempts,
                                )
                                time.sleep(retry_delay_sec)
                                continue
                            break
                        guard_ok, block_state = _read_write_guard(client, unit)
                        if not guard_ok:
                            _drop_tcp_client()
                            if known_state and not airfi_machine_blocks_ventilation(known_state):
                                block_state = known_state
                                client = _acquire_tcp_client(
                                    path_host,
                                    tcp_port,
                                    connect_timeout=path_connect_timeout,
                                    read_timeout=path_read_timeout,
                                )
                                if client is None:
                                    if attempt < attempts:
                                        time.sleep(retry_delay_sec)
                                        continue
                                    break
                            else:
                                if attempt < attempts:
                                    log.info(
                                        "write_fan_pct luku epäonnistui %s (%s/%s)",
                                        path_label,
                                        attempt,
                                        attempts,
                                    )
                                    time.sleep(retry_delay_sec)
                                    continue
                                break
                    else:
                        serial_client = _open_client(
                            host=None,
                            port=tcp_port,
                            serial=path_serial,
                            baud=baud,
                            read_timeout=path_read_timeout,
                        )
                        client = serial_client
                        if client is None:
                            break
                        has_cache = bool(
                            known_state
                            and (
                                known_state.get("airfi_online")
                                or known_state.get("fan_supply_pct") is not None
                            )
                        )
                        if not has_cache:
                            snap = _read_snapshot(
                                client,
                                unit,
                                connect_timeout=path_connect_timeout,
                                read_timeout=path_read_timeout,
                                is_tcp=False,
                            )
                            if not snap.ok:
                                if attempt < attempts:
                                    time.sleep(retry_delay_sec)
                                    continue
                                break
                            block_state = snap.state
                        else:
                            if not client.connect():
                                if attempt < attempts:
                                    time.sleep(retry_delay_sec)
                                    continue
                                break
                            block_state = known_state

                    if airfi_machine_blocks_ventilation(block_state):
                        log.warning(
                            "write_fan_pct estetty — hätäseis/vika (errors=%s emergency=%s)",
                            block_state.get("airfi_errors"),
                            block_state.get("emergency_stop"),
                        )
                        return False

                    ok = _write_fan_registers(
                        client,
                        unit,
                        supply,
                        exhaust,
                        known_state=block_state,
                        is_tcp=is_tcp,
                    )
                    if not ok:
                        if attempt < attempts:
                            log.info(
                                "write_fan_pct kirjoitus epäonnistui %s (%s/%s)",
                                path_label,
                                attempt,
                                attempts,
                            )
                            time.sleep(retry_delay_sec)
                            continue
                        break

                    verify_ok, verify_state = _verify_fan_write(client, unit, supply, exhaust)
                    if verify_ok:
                        return True

                    if verify_state.get("airfi_online") and (
                        airfi_machine_blocks_ventilation(verify_state)
                        or airfi_stuck_direct_emergency(verify_state)
                    ):
                        log.warning(
                            "write_fan_pct hylätty — kone hätäseis/vika tai nopeus 0 (fans=%s/%s emergency=%s)",
                            verify_state.get("fan_supply_pct"),
                            verify_state.get("fan_exhaust_pct"),
                            verify_state.get("emergency_stop"),
                        )
                        if is_tcp:
                            _rollback_tcp_direct(client, unit)
                        return False

                    log.warning(
                        "write_fan_pct ei saavuttanut tavoitetta %s (fans=%s/%s, tavoite=%s/%s)",
                        path_label,
                        verify_state.get("fan_supply_pct"),
                        verify_state.get("fan_exhaust_pct"),
                        supply,
                        exhaust,
                    )
                    if attempt < attempts:
                        time.sleep(retry_delay_sec)
                        continue
                    break
                except Exception as exc:
                    log.warning("write_fan_pct failed (%s): %s", path_label, exc)
                    if is_tcp:
                        _drop_tcp_client()
                    if attempt < attempts:
                        time.sleep(retry_delay_sec)
                        continue
                    break
                finally:
                    if serial_client is not None:
                        _safe_close(serial_client)
            log.info("write_fan_pct polku %s epäonnistui — kokeillaan seuraavaa", path_label)
        log.warning("write_fan_pct estetty — kaikki polut epäonnistuivat")
        return False


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
    _modbus_pause(is_tcp=bool(host))
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
    _modbus_pause(is_tcp=bool(host))
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
    _modbus_pause(is_tcp=bool(host))
    return _write_with_client(
        client,
        unit,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        is_tcp=bool(host),
        sauna_mode=active,
    )


def _write_registers(
    client: _ModbusClient,
    unit: int,
    *,
    connect_timeout: float,
    read_timeout: float,
    is_tcp: bool,
    writes: list[tuple[int, int]],
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
        for address, value in writes:
            w = client.write_register(address, value, device_id=unit)
            if w.isError():
                log.warning("Modbus write failed: reg %s = %s", address, value)
                return False
        return True
    except Exception as exc:
        log.warning("Modbus write failed: %s", exc)
        return False
    finally:
        _safe_close(client)


def airfi_machine_blocks_ventilation(state: dict[str, Any]) -> bool:
    """Koneen tila estää tuuletuksen (hätäseis, vikatilat)."""
    if state.get("emergency_stop"):
        return True
    if state.get("machine_fault"):
        return True
    if state.get("freezing_alarm"):
        return True
    raw = state.get("airfi_error_raw")
    if isinstance(raw, int) and (raw & 2) != 0:
        return True
    return False


def airfi_auto_ventilation_blocked(state: dict[str, Any]) -> bool:
    """Automaattinen tuuletus estetty myös kuittauksen jälkeisen tauon aikana."""
    if airfi_ack_cooldown_active():
        return True
    return airfi_machine_blocks_ventilation(state)


def airfi_ventilation_blocked(state: dict[str, Any]) -> bool:
    """Yhteensopivuus — sama kuin automaattinen esto."""
    return airfi_auto_ventilation_blocked(state)


def airfi_stuck_direct_emergency(state: dict[str, Any]) -> bool:
    """Suoraohjaus jäi päälle 0 %:lla — usein aiheuttaa E1/hätäseis -tilan."""
    if not state.get("direct_control"):
        return False
    supply = state.get("fan_supply_pct")
    exhaust = state.get("fan_exhaust_pct")
    if not isinstance(supply, (int, float)) or not isinstance(exhaust, (int, float)):
        return False
    if int(supply) > 0 or int(exhaust) > 0:
        return False
    if state.get("emergency_stop"):
        return True
    raw = state.get("airfi_error_raw")
    return isinstance(raw, int) and (raw & 2) != 0


def ack_airfi_alarms(
    *,
    host: str | None,
    tcp_port: int,
    serial: str | None,
    baud: int,
    unit: int,
    connect_timeout: float = 4.0,
    read_timeout: float = 5.0,
    retry_count: int = 2,
    retry_delay_sec: float = 8.0,
) -> bool:
    """Kuittaa hätäseis/E1 — nollaa pakko-ohjaus, suoraohjaus ja poissa (4x00002=0)."""
    attempts = max(1, retry_count + 1)
    writes = [
        (HOLDING["constant_pressure_mode"], 0),
        (HOLDING["emergency_stop"], 0),
        (HOLDING["direct_combined_pct"], 0),
        (HOLDING["supply_direct_pct"], 0),
        (HOLDING["exhaust_direct_pct"], 0),
        (HOLDING["direct_control_enabled"], 0),
        (HOLDING["away_mode"], 0),
    ]
    with _modbus_lock:
        for attempt in range(1, attempts + 1):
            is_tcp = bool(host)
            _modbus_pause_locked(is_tcp=is_tcp)
            serial_client: _ModbusClient | None = None
            try:
                if is_tcp:
                    client = _acquire_tcp_client(
                        host,
                        tcp_port,
                        connect_timeout=connect_timeout,
                        read_timeout=read_timeout,
                    )
                else:
                    serial_client = _open_client(
                        host=None,
                        port=tcp_port,
                        serial=serial,
                        baud=baud,
                        read_timeout=read_timeout,
                    )
                    client = serial_client
                if client is None:
                    if attempt < attempts:
                        time.sleep(retry_delay_sec)
                        continue
                    return False
                if not is_tcp and not client.connect():
                    if attempt < attempts:
                        time.sleep(retry_delay_sec)
                        continue
                    return False
                ok = True
                for address, value in writes:
                    w = client.write_register(address, value, device_id=unit)
                    if w.isError():
                        log.warning("Modbus ack write failed reg %s", address)
                        ok = False
                        break
                if ok:
                    mark_airfi_ack_cooldown()
                    return True
                if is_tcp:
                    _drop_tcp_client()
                if attempt < attempts:
                    time.sleep(retry_delay_sec)
            except Exception as exc:
                log.warning("Modbus ack failed: %s", exc)
                if is_tcp:
                    _drop_tcp_client()
                if attempt < attempts:
                    time.sleep(retry_delay_sec)
            finally:
                if serial_client is not None:
                    _safe_close(serial_client)
    return False


def write_fireplace(
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
    _modbus_pause(is_tcp=bool(host))
    return _write_registers(
        client,
        unit,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        is_tcp=bool(host),
        writes=[(HOLDING["fireplace"], 1 if active else 0)],
    )


def write_speed_level(
    *,
    host: str | None,
    tcp_port: int,
    serial: str | None,
    baud: int,
    unit: int,
    level: int,
    connect_timeout: float = 4.0,
    read_timeout: float = 5.0,
) -> bool:
    """4x00001 (h0) ei ole käytettävissä TCP-yhteydellä tällä koneella — älä kirjoita."""
    log.warning(
        "Nopeustason Modbus-kirjoitus ohitettu (h0 ei tuettu, taso=%s)",
        level,
    )
    return False
