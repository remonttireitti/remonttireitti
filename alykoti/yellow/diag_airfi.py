#!/usr/bin/env python3
"""Diagnose AirFi Modbus TCP at 192.168.50.26"""
import subprocess
import sys

from alykoti_yellow import config
from alykoti_yellow.modbus_airfi import probe_tcp, read_airfi_tcp

HOST = config.AIRFI_MODBUS_HOST or "192.168.50.26"
PORT = config.AIRFI_MODBUS_PORT
UNIT = config.AIRFI_UNIT

print(f"Ping target {HOST}...")
subprocess.run(["ping", "-c", "1", "-W", "2", HOST], check=False)

print(f"\nProbe {HOST}:{PORT} unit {UNIT}...")
print("probe_tcp:", probe_tcp(HOST, PORT, UNIT, connect_timeout=4, read_timeout=5))

print(f"\nFull read {HOST}:{PORT} unit {UNIT}...")
snap = read_airfi_tcp(
    HOST,
    PORT,
    UNIT,
    connect_timeout=config.AIRFI_CONNECT_TIMEOUT_SEC,
    read_timeout=config.AIRFI_READ_TIMEOUT_SEC,
    retry_count=0,
)
print(snap)
sys.exit(0 if snap.ok else 1)
