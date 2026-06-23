"""HTTPS synkki alykoti/Vercel — tila ulos, komennot sisään."""

from __future__ import annotations

import logging
from typing import Any

import requests

log = logging.getLogger(__name__)


def sync_post(
    url: str,
    token: str,
    state: dict[str, Any],
    firmware_version: str,
    acked_ids: list[str],
    failed_commands: list[dict[str, str]] | None = None,
) -> dict[str, Any] | None:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body: dict[str, Any] = {
        "state": state,
        "firmware_version": firmware_version,
        "acked_command_ids": acked_ids,
    }
    if failed_commands:
        body["failed_commands"] = failed_commands
    try:
        # build_state (Zigbee + Z-Wave MQTT scan) runs before each sync — allow headroom.
        resp = requests.post(url, json=body, headers=headers, timeout=45)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        log.error("Sync failed: %s", exc)
        return None
