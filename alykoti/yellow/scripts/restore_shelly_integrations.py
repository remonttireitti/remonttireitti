#!/usr/bin/env python3
"""Palauta Shelly-integraatiot Pi:lle (local/integrations.json)."""
from __future__ import annotations

import json
import os
import sys
import time

import paramiko

HOST, USER = "192.168.50.108", "ek"
REMOTE = "/home/ek/alykoti-yellow"

INTEGRATIONS = {
    "shelly": {
        "devices": [
            {
                "id": "shelly:192.168.50.120",
                "host": "192.168.50.120",
                "name": "Energia mittaus koko talo",
                "gen": 1,
                "model": "Shelly",
            },
            {
                "id": "shelly:192.168.50.139",
                "host": "192.168.50.139",
                "name": "Glen MH valokytkin",
                "gen": 1,
                "model": "Shelly",
            },
            {
                "id": "shelly:192.168.50.172",
                "host": "192.168.50.172",
                "name": "shellypro4pm-30c6f78384bc",
                "gen": 2,
                "model": "SPSW-004PE16EU",
            },
        ]
    }
}


def main() -> int:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    pub = os.path.join(os.environ["USERPROFILE"], ".ssh/id_ed25519")
    c.connect(HOST, username=USER, key_filename=pub, timeout=15)

    payload = json.dumps(INTEGRATIONS, ensure_ascii=False, indent=2)
    sftp = c.open_sftp()
    try:
        sftp.mkdir(f"{REMOTE}/local")
    except OSError:
        pass
    with sftp.file(f"{REMOTE}/local/integrations.json", "w") as f:
        f.write(payload)
    sftp.close()
    print("wrote integrations.json")

    sudo = f"echo {os.environ.get('YELLOW_SSH_PASS', '')} | sudo -S" if os.environ.get("YELLOW_SSH_PASS") else "sudo"
    c.exec_command(f"{sudo} systemctl restart alykoti-yellow", timeout=30)[1].read()
    time.sleep(6)
    _, o, _ = c.exec_command("curl -s http://127.0.0.1:3080/api/energy/live", timeout=30)
    print(o.read().decode())
    c.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
