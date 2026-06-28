"""Hae hub-asetukset suoraan Supabasesta — ei riipu Vercel-synkistä."""

from __future__ import annotations

import logging
from typing import Any

import requests

from alykoti_yellow import config

log = logging.getLogger(__name__)


def fetch_hub_snapshot(device_token: str) -> dict[str, Any] | None:
    """Palauttaa automaatiot, integraatiot ja laitteet hub-riviltä."""
    url = (config.SUPABASE_URL or "").strip().rstrip("/")
    key = (config.SUPABASE_SERVICE_ROLE_KEY or "").strip()
    token = device_token.strip()
    if not url or not key or not token:
        return None

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    params = {
        "device_token": f"eq.{token}",
        "select": "control_mode,config,state",
        "limit": "1",
    }
    try:
        resp = requests.get(
            f"{url}/rest/v1/hubs",
            headers=headers,
            params=params,
            timeout=20,
        )
        resp.raise_for_status()
        rows = resp.json()
    except Exception as exc:
        log.warning("Supabase hub-haku epäonnistui: %s", exc)
        return None

    if not isinstance(rows, list) or not rows:
        log.warning("Supabase: hubia ei löytynyt device_tokenilla")
        return None

    row = rows[0]
    if not isinstance(row, dict):
        return None

    hub_config = row.get("config") if isinstance(row.get("config"), dict) else {}
    state = row.get("state") if isinstance(row.get("state"), dict) else {}
    automations = hub_config.get("automations")
    if not isinstance(automations, list):
        automations = state.get("automations")
    if not isinstance(automations, list):
        automations = []

    integrations = state.get("integrations")
    if not isinstance(integrations, dict):
        integrations = {}

    home_devices = state.get("home_devices")
    if not isinstance(home_devices, dict):
        home_devices = {}

    control_mode = row.get("control_mode")
    if not isinstance(control_mode, str):
        control_mode = None

    log.info(
        "Supabase hub ladattu — automaatiot=%s laitteet=%s",
        len(automations),
        len(home_devices),
    )
    return {
        "automations": automations,
        "integrations": integrations,
        "home_devices": home_devices,
        "hub_config": hub_config,
        "control_mode": control_mode,
    }
