"""Kevyt HTTP-palvelin paikalliseen ohjauspaneeliin."""

from __future__ import annotations

import json
import logging
import mimetypes
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from alykoti_yellow import config
from alykoti_yellow.local_ui import context

log = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).resolve().parent / "static"


def _json_response(handler: BaseHTTPRequestHandler, status: int, body: Any) -> None:
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(data)


def _read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any] | None:
    length = int(handler.headers.get("Content-Length") or 0)
    if length <= 0:
        return None
    try:
        raw = handler.rfile.read(length)
        parsed = json.loads(raw.decode("utf-8"))
        return parsed if isinstance(parsed, dict) else None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _device_rows(state: dict[str, Any]) -> list[dict[str, Any]]:
    home = state.get("home_devices")
    if not isinstance(home, dict):
        return []
    rows: list[dict[str, Any]] = []
    for device_id, meta in home.items():
        if not isinstance(meta, dict):
            continue
        kind = meta.get("kind") if isinstance(meta.get("kind"), str) else "other"
        rows.append(
            {
                "id": device_id,
                "name": meta.get("name") or meta.get("friendly_name") or device_id,
                "on": bool(meta.get("on")),
                "brightness": meta.get("brightness"),
                "reachable": meta.get("reachable", True) is not False,
                "kind": kind,
                "protocol": device_id.split(":", 1)[0] if ":" in device_id else "unknown",
                "room": meta.get("room"),
                "controllable": kind in ("light", "switch", "lock", "dimmer") or meta.get("controllable") is True,
            }
        )
    rows.sort(key=lambda r: (str(r.get("kind")), str(r.get("name")).lower()))
    return rows


def _group_devices(devices: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups = {"lights": [], "switches": [], "locks": [], "sensors": [], "other": []}
    for dev in devices:
        kind = dev.get("kind")
        if kind == "light":
            groups["lights"].append(dev)
        elif kind == "switch":
            groups["switches"].append(dev)
        elif kind == "lock":
            groups["locks"].append(dev)
        elif kind == "sensor":
            groups["sensors"].append(dev)
        else:
            groups["other"].append(dev)
    return groups


def _build_control_payload(state: dict[str, Any], device_id: str, on: bool, brightness: int | None) -> dict[str, Any]:
    payload: dict[str, Any] = {"id": device_id, "on": on}
    if brightness is not None:
        payload["brightness"] = brightness
    home = state.get("home_devices")
    if isinstance(home, dict):
        meta = home.get(device_id)
        if isinstance(meta, dict):
            for key in ("host", "channel", "gen", "mqtt_set_topic", "lock_set_topic"):
                if key in meta and meta[key] is not None:
                    payload[key] = meta[key]
    return payload


class LocalUiHandler(BaseHTTPRequestHandler):
    server_version = "alykoti-yellow-local/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        log.debug("local-ui %s - %s", self.address_string(), fmt % args)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in ("", "/"):
            return self._serve_static("index.html")
        if path.startswith("/static/"):
            return self._serve_static(path.removeprefix("/static/"))
        if path == "/api/status":
            return self._api_status()
        if path == "/api/lights":
            return self._api_lights()
        if path == "/api/home/devices":
            return self._api_lights()
        self.send_error(404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/lights/control":
            return self._api_control()
        self.send_error(404)

    def _serve_static(self, name: str) -> None:
        file_path = (STATIC_DIR / name).resolve()
        if not str(file_path).startswith(str(STATIC_DIR.resolve())):
            self.send_error(403)
            return
        if not file_path.is_file():
            self.send_error(404)
            return
        content = file_path.read_bytes()
        mime, _ = mimetypes.guess_type(str(file_path))
        self.send_response(200)
        self.send_header("Content-Type", mime or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _api_status(self) -> None:
        state = context.snapshot_state()
        info = context.meta()
        _json_response(
            self,
            200,
            {
                "online": True,
                "source": "yellow-local",
                "airfi_online": bool(state.get("airfi_online")),
                "mqtt_ok": info.get("mqtt_ok", True),
                "automation_count": info.get("automation_count", 0),
                "cloud_sync_ok": info.get("cloud_sync_ok"),
                "cloud_sync_url": config.SYNC_URL,
                "local_ui": True,
            },
        )

    def _api_lights(self) -> None:
        state = context.snapshot_state()
        devices = _device_rows(state)
        grouped = _group_devices(devices)
        _json_response(
            self,
            200,
            {
                "configured": True,
                "source": "yellow-local",
                "hubOnline": True,
                "devices": devices,
                **grouped,
            },
        )

    def _api_control(self) -> None:
        body = _read_json(self)
        if not body:
            _json_response(self, 400, {"ok": False, "error": "invalid_json"})
            return
        device_id = body.get("id")
        on = body.get("on")
        if not isinstance(device_id, str) or not isinstance(on, bool):
            _json_response(self, 400, {"ok": False, "error": "id and on required"})
            return
        brightness = body.get("brightness")
        bri = int(brightness) if isinstance(brightness, (int, float)) else None
        state = context.snapshot_state()
        payload = _build_control_payload(state, device_id, on, bri)
        ok = context.run_command("set_device", payload)
        _json_response(self, 200 if ok else 503, {"ok": ok, "local": True})


def start_local_ui() -> None:
    if not config.LOCAL_UI_ENABLED:
        return

    def _run() -> None:
        import socket

        server = ThreadingHTTPServer((config.LOCAL_UI_HOST, config.LOCAL_UI_PORT), LocalUiHandler)
        lan_ip = "127.0.0.1"
        try:
            probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            probe.connect(("1.1.1.1", 80))
            lan_ip = probe.getsockname()[0]
            probe.close()
        except OSError:
            pass
        log.info(
            "Paikallinen ohjauspaneeli http://%s:%s/",
            lan_ip,
            config.LOCAL_UI_PORT,
        )
        try:
            server.serve_forever()
        except Exception as exc:
            log.warning("Paikallinen UI pysähtyi: %s", exc)

    threading.Thread(target=_run, name="local-ui", daemon=True).start()
