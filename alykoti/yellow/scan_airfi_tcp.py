#!/usr/bin/env python3
"""Scan LAN for Modbus TCP (port 502) and probe AirFi register 4."""
from __future__ import annotations

import socket
from concurrent.futures import ThreadPoolExecutor, as_completed

from pymodbus.client import ModbusTcpClient

PREFIX = "192.168.50"
PORT = 502
UNIT = 1


def port_open(ip: str) -> bool:
    try:
        with socket.create_connection((ip, PORT), timeout=0.4):
            return True
    except OSError:
        return False


def probe_airfi(ip: str) -> str | None:
    if not port_open(ip):
        return None
    client = ModbusTcpClient(ip, port=PORT, timeout=2)
    try:
        if not client.connect():
            return f"{ip}:{PORT} open, modbus connect failed"
        rr = client.read_input_registers(4, count=1, device_id=UNIT)
        if rr.isError() or not rr.registers:
            return f"{ip}:{PORT} open, register 4 read failed"
        raw = rr.registers[0]
        temp = (raw - 65536 if raw > 32767 else raw) / 10.0
        return f"{ip}:{PORT} AirFi? outdoor_temp={temp:.1f}C (raw reg4={raw})"
    except Exception as exc:
        return f"{ip}:{PORT} error: {exc}"
    finally:
        client.close()


def main() -> None:
    ips = [f"{PREFIX}.{i}" for i in range(1, 255)]
    found: list[str] = []
    with ThreadPoolExecutor(max_workers=64) as pool:
        futures = {pool.submit(probe_airfi, ip): ip for ip in ips}
        for fut in as_completed(futures):
            result = fut.result()
            if result:
                found.append(result)
    if not found:
        print("No Modbus TCP / AirFi found on", PREFIX + ".0/24")
        return
    for line in sorted(found):
        print(line)


if __name__ == "__main__":
    main()
