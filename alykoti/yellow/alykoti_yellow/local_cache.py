"""Paikallinen välimuisti — automaatiot ja laitteet heti käynnistyksessä."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

CACHE_FILE = Path(__file__).resolve().parent.parent / ".hub_cache.json"
CACHE_BACKUP = CACHE_FILE.with_suffix(".json.bak")


def load_cache() -> dict[str, Any] | None:
    if not CACHE_FILE.is_file():
        return _load_backup()
    try:
        raw = CACHE_FILE.read_text(encoding="utf-8").strip()
        if not raw:
            log.warning("Välimuisti tyhjä — yritetään varmuuskopiota")
            return _load_backup()
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("Välimuistin luku epäonnistui: %s", exc)
    return _load_backup()


def _load_backup() -> dict[str, Any] | None:
    if not CACHE_BACKUP.is_file():
        return None
    try:
        data = json.loads(CACHE_BACKUP.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            log.info("Välimuisti palautettu varmuuskopiosta")
            return data
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("Välimuistin varmuuskopio rikki: %s", exc)
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

    if not existing:
        return

    payload = json.dumps(existing, ensure_ascii=False, indent=2)
    tmp = CACHE_FILE.with_suffix(".json.tmp")
    try:
        tmp.write_text(payload, encoding="utf-8")
        os.replace(tmp, CACHE_FILE)
        CACHE_BACKUP.write_text(payload, encoding="utf-8")
    except OSError as exc:
        log.warning("Välimuistin tallennus epäonnistui: %s", exc)
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass


load_hub_cache = load_cache
save_hub_cache = save_cache
