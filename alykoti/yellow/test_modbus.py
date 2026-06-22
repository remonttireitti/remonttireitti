#!/usr/bin/env python3
from alykoti_yellow.modbus_airfi import read_airfi_tcp
import os

host = os.environ.get("AIRFI_MODBUS_HOST", "192.168.50.26")
port = int(os.environ.get("AIRFI_MODBUS_PORT", "502"))
unit = int(os.environ.get("AIRFI_MODBUS_UNIT", "1"))
print(read_airfi_tcp(host, port, unit))
