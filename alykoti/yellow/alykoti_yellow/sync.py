"""HTTPS synkki alykoti/Vercel — tila ulos, komennot sisään."""

from __future__ import annotations

import logging
from typing import Any

import requests

log = logging.getLogger(__name__)


def _sync_request(
    url: str,
    token: str,
    body: dict[str, Any],
    timeout: float,
) -> dict[str, Any] | None:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    try:
        resp = requests.post(url, json=body, headers=headers, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        log.error("Sync failed: %s", exc)
        return None


def sync_post(
    url: str,
    token: str,
    state: dict[str, Any],
    firmware_version: str,
    acked_ids: list[str],
    failed_commands: list[dict[str, str]] | None = None,
) -> dict[str, Any] | None:
    body: dict[str, Any] = {
        "state": state,
        "firmware_version": firmware_version,
        "acked_command_ids": acked_ids,
    }
    if failed_commands:
        body["failed_commands"] = failed_commands
    # build_state (Zigbee + Z-Wave MQTT scan) runs before each sync — allow headroom.
    return _sync_request(url, token, body, timeout=45)


def quick_pull(
    url: str,
    token: str,
    airfi_snapshot: dict[str, Any],
    acked_ids: list[str],
    failed_commands: list[dict[str, str]] | None = None,
) -> dict[str, Any] | None:
    body: dict[str, Any] = {
        "quick": True,
        "state": airfi_snapshot,
        "acked_command_ids": acked_ids,
    }
    if failed_commands:
        body["failed_commands"] = failed_commands
    return _sync_request(url, token, body, timeout=12)
