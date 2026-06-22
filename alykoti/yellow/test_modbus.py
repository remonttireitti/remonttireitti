#!/usr/bin/env python3
"""Test AirFi Modbus on all likely serial ports."""
from alykoti_yellow.modbus_airfi import read_airfi

PORTS = ["/dev/ttyAMA0", "/dev/ttyAMA2", "/dev/ttyAMA4", "/dev/ttyUSB0"]

if __name__ == "__main__":
    for port in PORTS:
        snap = read_airfi(port, 9600, 1)
        print(f"{port}: ok={snap.ok} state={snap.state}")
