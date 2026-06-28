"""Paikalliset automaatiot ja integraatiot — Yellown lähde ilman nettiä."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

LOCAL_DIR = Path(__file__).resolve().parent.parent / "local"
AUTOMATIONS_FILE = LOCAL_DIR / "automations.json"
INTEGRATIONS_FILE = LOCAL_DIR / "integrations.json"
HUB_CONFIG_FILE = LOCAL_DIR / "hub_config.json"
CONTROL_MODE_FILE = LOCAL_DIR / "control_mode.json"


def _read_json(path: Path) -> Any | None:
    if not path.is_file():
        return None
    try:
        raw = path.read_text(encoding="utf-8").strip()
        if not raw:
            return None
        return json.loads(raw)
    except (OSError, json.JSONDecodeError) as exc:
        log.warning("Paikallinen tiedosto rikki (%s): %s", path.name, exc)
        return None


def _write_json(path: Path, data: Any) -> None:
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        tmp.write_text(payload, encoding="utf-8")
        os.replace(tmp, path)
    except OSError as exc:
        log.warning("Paikallinen tallennus epäonnistui (%s): %s", path.name, exc)
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass


def load_local_store() -> dict[str, Any] | None:
    """Lue Yellown paikalliset automaatiot ja integraatiot."""
    automations = _read_json(AUTOMATIONS_FILE)
    integrations = _read_json(INTEGRATIONS_FILE)
    hub_config = _read_json(HUB_CONFIG_FILE)
    control_mode_raw = _read_json(CONTROL_MODE_FILE)

    snap: dict[str, Any] = {}
    if isinstance(automations, list):
        snap["automations"] = automations
    if isinstance(integrations, dict):
        snap["integrations"] = integrations
    if isinstance(hub_config, dict):
        snap["hub_config"] = hub_config
        if "automations" not in snap and isinstance(hub_config.get("automations"), list):
            snap["automations"] = hub_config["automations"]
    if isinstance(control_mode_raw, dict) and isinstance(control_mode_raw.get("mode"), str):
        snap["control_mode"] = control_mode_raw["mode"]
    elif isinstance(control_mode_raw, str):
        snap["control_mode"] = control_mode_raw

    return snap or None


def has_local_automations() -> bool:
    automations = _read_json(AUTOMATIONS_FILE)
    return isinstance(automations, list) and len(automations) > 0


def has_local_integrations() -> bool:
    integrations = _read_json(INTEGRATIONS_FILE)
    if not isinstance(integrations, dict) or not integrations:
        return False
    for key in ("shelly", "tasmota", "airthings"):
        block = integrations.get(key)
        if isinstance(block, dict) and block.get("devices"):
            return True
    return False


def _snapshot_has_data(snap: dict[str, Any]) -> bool:
    if isinstance(snap.get("integrations"), dict) and snap["integrations"]:
        return True
    if isinstance(snap.get("automations"), list) and snap["automations"]:
        return True
    if isinstance(snap.get("hub_config"), dict) and snap["hub_config"]:
        return True
    if isinstance(snap.get("home_devices"), dict) and snap["home_devices"]:
        return True
    return False


def persist_local_snapshot(snap: dict[str, Any]) -> None:
    """Tallenna pilvestä/synkistä saatu config paikallisiin tiedostoihin."""
    automations = snap.get("automations")
    if isinstance(automations, list) and automations:
        _write_json(AUTOMATIONS_FILE, automations)
        log.info("Paikalliset automaatiot tallennettu (%s sääntöä)", len(automations))

    integrations = snap.get("integrations")
    if isinstance(integrations, dict) and integrations:
        _write_json(INTEGRATIONS_FILE, integrations)

    hub_config = snap.get("hub_config")
    if isinstance(hub_config, dict) and hub_config:
        _write_json(HUB_CONFIG_FILE, hub_config)

    control_mode = snap.get("control_mode")
    if isinstance(control_mode, str) and control_mode:
        _write_json(CONTROL_MODE_FILE, {"mode": control_mode})


def migrate_cache_to_local(cache: dict[str, Any]) -> bool:
    """Siirrä vanha .hub_cache.json → local/ kerran."""
    if has_local_automations() or has_local_integrations():
        return False
    automations = cache.get("automations")
    if not isinstance(automations, list) or not automations:
        hub_config = cache.get("hub_config")
        if isinstance(hub_config, dict) and isinstance(hub_config.get("automations"), list):
            automations = hub_config["automations"]
            cache = {**cache, "automations": automations}
    if not _snapshot_has_data(cache):
        return False
    persist_local_snapshot(cache)
    log.info("Hub-data siirretty välimuistista → local/")
    return True
