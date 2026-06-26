"""Paikallinen välimuisti — automaatiot ja laitteet heti käynnistyksessä."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

CACHE_FILE = Path(__file__).resolve().parent.parent / ".hub_cache.json"


def load_cache() -> dict[str, Any] | None:
    if not CACHE_FILE.is_file():
        return None
    try:
        data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("Välimuistin luku epäonnistui: %s", exc)
    return None


def save_cache(
    *,
    automations: list[dict[str, Any]] | None = None,
    integrations: dict[str, Any] | None = None,
    home_devices: dict[str, Any] | None = None,
    hub_config: dict[str, Any] | None = None,
    control_mode: str | None = None,
) -> None:
    existing = load_cache() or {}
    if automations is not None:
        existing["automations"] = automations
    if integrations is not None:
        existing["integrations"] = integrations
    if home_devices is not None:
        existing["home_devices"] = home_devices
    if hub_config is not None:
        existing["hub_config"] = hub_config
    if control_mode is not None:
        existing["control_mode"] = control_mode
    try:
        CACHE_FILE.write_text(
            json.dumps(existing, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except OSError as exc:
        log.warning("Välimuistin tallennus epäonnistui: %s", exc)


load_hub_cache = load_cache
save_hub_cache = save_cache
