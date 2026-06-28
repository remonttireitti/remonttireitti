"""HTTP-palvelin paikalliselle API:lle (Yellow → Next.js LOCAL_MODE)."""

from __future__ import annotations

import json
import logging
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

from alykoti_yellow import config
from alykoti_yellow.local_ui import context
from alykoti_yellow.local_ui import responses

log = logging.getLogger(__name__)


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


def _text_response(handler: BaseHTTPRequestHandler, status: int, body: str, content_type: str) -> None:
    data = body.encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", content_type)
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


class LocalApiHandler(BaseHTTPRequestHandler):
    server_version = "alykoti-yellow-api/2.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        log.debug("local-api %s - %s", self.address_string(), fmt % args)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        query = parse_qs(urlparse(self.path).query)

        if path in ("", "/"):
            return _text_response(
                self,
                404,
                (
                    "Alykoti Yellow API — käytä Next.js-käyttöliittymää "
                    f"{config.LOCAL_NEXTJS_URL} tai API-polkuja /api/*."
                ),
                "text/plain; charset=utf-8",
            )
        if path == "/api/hub":
            return _json_response(self, 200, responses.build_hub())
        if path == "/api/status":
            return _json_response(self, 200, responses.build_status())
        if path == "/api/device/status":
            return _json_response(self, 200, responses.build_device_status())
        if path in ("/api/lights", "/api/home/devices"):
            if path == "/api/lights":
                return _json_response(self, 200, responses.build_lights())
            return _json_response(self, 200, responses.build_home_devices())
        if path == "/api/energy":
            return _json_response(self, 200, responses.build_energy())
        if path == "/api/energy/live":
            return _json_response(self, 200, responses.build_energy_live())
        if path == "/api/floor-plan":
            return _json_response(self, 200, responses.build_floor_plan())
        if path == "/api/automations":
            return _json_response(self, 200, responses.build_automations())
        if path == "/api/heating/thermostats":
            return _json_response(self, 200, responses.build_heating_thermostats())
        if path == "/api/device/commands":
            return _json_response(self, 200, {"commands": []})
        if path.startswith("/api/devices/"):
            device_id = path.removeprefix("/api/devices/")
            protocol = query.get("protocol", [None])[0]
            detail = responses.build_device_detail(device_id, protocol)
            if detail is None:
                return _json_response(self, 404, {"error": "device_not_found"})
            return _json_response(self, 200, detail)
        self.send_error(404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/lights/control":
            return self._api_control()
        if path == "/api/device/commands":
            return self._api_command()
        self.send_error(404)

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
        payload = responses.build_control_payload(state, device_id, on, bri)
        ok = context.run_command("set_device", payload)
        _json_response(
            self,
            200 if ok else 503,
            {"ok": ok, "queued": False, "local": True, "commandId": "local-ui"},
        )

    def _api_command(self) -> None:
        body = _read_json(self)
        if not body:
            _json_response(self, 400, {"ok": False, "error": "invalid_json"})
            return
        command = body.get("command")
        payload = body.get("payload")
        if not isinstance(command, str):
            _json_response(self, 400, {"ok": False, "error": "command required"})
            return
        if not isinstance(payload, dict):
            payload = {}
        ok = context.run_command(command, payload)
        _json_response(self, 200 if ok else 503, {"ok": ok, "local": True})


def start_local_ui() -> None:
    if not config.LOCAL_UI_ENABLED:
        return

    def _run() -> None:
        import socket

        port = config.LOCAL_API_PORT
        server = ThreadingHTTPServer((config.LOCAL_UI_HOST, port), LocalApiHandler)
        lan_ip = "127.0.0.1"
        try:
            probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            probe.connect(("1.1.1.1", 80))
            lan_ip = probe.getsockname()[0]
            probe.close()
        except OSError:
            pass
        log.info(
            "Paikallinen API http://%s:%s/ — Next.js UI %s",
            lan_ip,
            port,
            config.LOCAL_NEXTJS_URL,
        )
        try:
            server.serve_forever()
        except Exception as exc:
            log.warning("Paikallinen API pysähtyi: %s", exc)

    threading.Thread(target=_run, name="local-api", daemon=True).start()
