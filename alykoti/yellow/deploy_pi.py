#!/usr/bin/env python3
"""Deploy alykoti-yellow to HA Yellow via SSH."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import paramiko

HOST, USER = "192.168.50.108", "ek"
PASS = os.environ.get("YELLOW_SSH_PASS", "")
ROOT = Path(__file__).resolve().parent
REMOTE_YELLOW = "/home/ek/alykoti-yellow"
FILES = {
    local: f"{REMOTE_YELLOW}/alykoti_yellow/{local.name}"
    for local in sorted((ROOT / "alykoti_yellow").glob("*.py"))
}
FILES[ROOT / "install/alykoti-yellow.service"] = (
    f"{REMOTE_YELLOW}/install/alykoti-yellow.service"
)


def _emit(text: str) -> None:
    """Print SSH output safely on Windows consoles (cp1252)."""
    try:
        print(text)
    except UnicodeEncodeError:
        enc = getattr(sys.stdout, "encoding", None) or "utf-8"
        print(text.encode(enc, errors="replace").decode(enc, errors="replace"))


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 60) -> int:
    print("$", cmd)
    _stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        _emit(out.strip())
    if err.strip():
        _emit(f"ERR: {err.strip()}")
    print("exit", code)
    return code


def main() -> int:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    pub = Path(os.environ["USERPROFILE"]) / ".ssh/id_ed25519"
    key_path = str(pub) if pub.is_file() else None
    try:
        client.connect(
            HOST,
            username=USER,
            password=PASS or None,
            key_filename=key_path,
            timeout=15,
            allow_agent=True,
            look_for_keys=True,
        )
    except paramiko.SSHException as exc:
        print("SSH failed:", exc)
        return 1
    sftp = client.open_sftp()

    pub = Path(os.environ["USERPROFILE"]) / ".ssh/id_ed25519.pub"
    if pub.is_file():
        key = pub.read_text(encoding="utf-8").strip().replace('"', '\\"')
        run(client, "mkdir -p ~/.ssh && chmod 700 ~/.ssh")
        run(
            client,
            f'grep -qxF "{key}" ~/.ssh/authorized_keys 2>/dev/null || echo "{key}" >> ~/.ssh/authorized_keys',
        )
        run(client, "chmod 600 ~/.ssh/authorized_keys")

    for local, remote in FILES.items():
        sftp.put(str(local), remote)
        print("copied", local.name, "->", remote)

    sftp.close()

    run(client, "test -f /home/ek/alykoti-yellow/.env && grep ALYKOTI_DEVICE_TOKEN /home/ek/alykoti-yellow/.env | head -1")
    run(
        client,
        "cd /home/ek/alykoti-yellow && . .venv/bin/activate && timeout 40 python -m alykoti_yellow.main",
        timeout=50,
    )

    sudo = f"echo {PASS} | sudo -S" if PASS else "sudo"
    run(client, f"{sudo} cp /home/ek/alykoti-yellow/install/alykoti-yellow.service /etc/systemd/system/")
    run(client, f"{sudo} systemctl daemon-reload")
    run(client, f"{sudo} systemctl enable alykoti-yellow")
    run(client, f"{sudo} systemctl restart alykoti-yellow")
    run(client, f"{sudo} systemctl is-active alykoti-yellow")
    run(client, f"{sudo} journalctl -u alykoti-yellow -n 20 --no-pager")

    client.close()
    print("DONE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
