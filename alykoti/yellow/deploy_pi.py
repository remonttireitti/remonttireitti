#!/usr/bin/env python3
"""Deploy alykoti-yellow + paikallinen Next.js web Pi:lle SSH:lla."""

from __future__ import annotations

import os
import sys
import tarfile
from io import BytesIO
from pathlib import Path

import paramiko

HOST, USER = "192.168.50.108", "ek"
PASS = os.environ.get("YELLOW_SSH_PASS", "")
ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
WEB = REPO / "alykoti" / "web"
REMOTE_YELLOW = "/home/ek/alykoti-yellow"
REMOTE_WEB = f"{REMOTE_YELLOW}/web"

WEB_EXCLUDE = {
    "node_modules",
    ".next",
    ".git",
    ".env.local",
}


def _emit(text: str) -> None:
    try:
        print(text)
    except UnicodeEncodeError:
        enc = getattr(sys.stdout, "encoding", None) or "utf-8"
        print(text.encode(enc, errors="replace").decode(enc, errors="replace"))


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 120) -> int:
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


def _ensure_remote_dir(sftp: paramiko.SFTPClient, path: str) -> None:
    parts: list[str] = []
    for part in path.strip("/").split("/"):
        parts.append(part)
        cur = "/" + "/".join(parts)
        try:
            sftp.stat(cur)
        except OSError:
            sftp.mkdir(cur)


def upload_tree(sftp: paramiko.SFTPClient, local_root: Path, remote_root: str) -> None:
    for local in sorted(local_root.rglob("*")):
        rel = local.relative_to(local_root).as_posix()
        if any(part == "__pycache__" for part in local.parts):
            continue
        remote = f"{remote_root}/{rel}"
        if local.is_dir():
            _ensure_remote_dir(sftp, remote)
            continue
        if local.suffix not in (".py", ".service", ".html", ".json", ".md"):
            continue
        _ensure_remote_dir(sftp, str(Path(remote).parent.as_posix()))
        sftp.put(str(local), remote)
        print("copied", rel)


def upload_web_tar(client: paramiko.SSHClient) -> int:
    buf = BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for path in sorted(WEB.rglob("*")):
            rel = path.relative_to(WEB)
            if any(part in WEB_EXCLUDE for part in rel.parts):
                continue
            if path.is_file():
                tar.add(path, arcname=str(rel).replace("\\", "/"))
    data = buf.getvalue()
    run(client, f"mkdir -p {REMOTE_WEB}")
    sftp = client.open_sftp()
    with sftp.file(f"{REMOTE_WEB}/deploy.tgz", "wb") as remote:
        remote.write(data)
    sftp.close()
    return run(
        client,
        f"cd {REMOTE_WEB} && tar xzf deploy.tgz && rm deploy.tgz",
        timeout=180,
    )


def patch_env(client: paramiko.SSHClient) -> None:
    """Lisää paikallisen API:n asetukset .env-tiedostoon jos puuttuvat."""
    lines = [
        "LOCAL_API_PORT=3080",
        "LOCAL_HUB_ID=local-yellow",
        "LOCAL_HUB_NAME=Yellow",
        "LOCAL_NEXTJS_URL=http://127.0.0.1:3001",
    ]
    for line in lines:
        key = line.split("=", 1)[0]
        run(
            client,
            f"grep -q '^{key}=' {REMOTE_YELLOW}/.env 2>/dev/null || echo '{line}' >> {REMOTE_YELLOW}/.env",
        )
    run(
        client,
        f"mkdir -p {REMOTE_WEB} && printf '%s\\n' 'ALYKOTI_LOCAL_MODE=1' 'YELLOW_API_URL=http://127.0.0.1:3080' > {REMOTE_WEB}/.env.local",
    )


def main() -> int:
    if not WEB.is_dir():
        print("Web-kansio puuttuu:", WEB)
        return 1

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
    upload_tree(sftp, ROOT / "alykoti_yellow", f"{REMOTE_YELLOW}/alykoti_yellow")
    upload_tree(sftp, ROOT / "install", f"{REMOTE_YELLOW}/install")
    sftp.close()

    if upload_web_tar(client) != 0:
        client.close()
        return 1

    patch_env(client)

    run(client, f"cd {REMOTE_WEB} && npm ci 2>/dev/null || npm install", timeout=600)
    run(client, f"cd {REMOTE_WEB} && npm run build", timeout=600)

    sudo = f"echo {PASS} | sudo -S" if PASS else "sudo"
    for svc in ("alykoti-yellow.service", "alykoti-web.service"):
        run(client, f"{sudo} cp {REMOTE_YELLOW}/install/{svc} /etc/systemd/system/")
    run(client, f"{sudo} systemctl daemon-reload")
    run(client, f"{sudo} systemctl enable alykoti-yellow alykoti-web")
    run(client, f"{sudo} systemctl restart alykoti-yellow")
    run(client, f"{sudo} systemctl restart alykoti-web")
    run(client, f"{sudo} systemctl is-active alykoti-yellow alykoti-web")
    run(client, f"{sudo} journalctl -u alykoti-yellow -n 15 --no-pager")
    run(client, f"{sudo} journalctl -u alykoti-web -n 15 --no-pager")

    client.close()
    print(f"DONE — UI http://{HOST}:3001  API http://{HOST}:3080")
    return 0


if __name__ == "__main__":
    sys.exit(main())
