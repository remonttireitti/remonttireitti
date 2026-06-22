#!/usr/bin/env python3
from pymodbus.client import ModbusTcpClient

CANDIDATES = [26, 17, 58, 84, 71, 112, 136, 39, 59, 155, 120]

for n in CANDIDATES:
    ip = f"192.168.50.{n}"
    c = ModbusTcpClient(ip, port=502, timeout=2)
    try:
        if not c.connect():
            print(f"{ip}: no tcp")
            continue
        r = c.read_input_registers(4, count=1, device_id=1)
        if r.isError() or not r.registers:
            print(f"{ip}: tcp ok, reg4 fail")
        else:
            raw = r.registers[0]
            t = (raw - 65536 if raw > 32767 else raw) / 10.0
            print(f"{ip}: OK outdoor={t:.1f}C raw={raw}")
    except Exception as exc:
        print(f"{ip}: {exc}")
    finally:
        c.close()
