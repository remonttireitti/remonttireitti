#!/usr/bin/env python3
import socket

ip = "192.168.50.26"
ports = [502, 1502, 5502, 8502, 8899, 80, 443, 8080]

for port in ports:
    try:
        with socket.create_connection((ip, port), timeout=2):
            print(f"{ip}:{port} OPEN")
    except OSError as exc:
        print(f"{ip}:{port} closed ({exc})")
