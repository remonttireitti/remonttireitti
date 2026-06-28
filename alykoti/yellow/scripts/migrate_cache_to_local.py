#!/usr/bin/env python3
"""Siirrä .hub_cache.json → local/ (aja Yellow-kansiossa)."""
from __future__ import annotations

import sys

sys.path.insert(0, ".")

from alykoti_yellow.local_cache import load_cache
from alykoti_yellow.local_store import has_local_automations, migrate_cache_to_local


def main() -> int:
    if has_local_automations():
        print("local/automations.json on jo olemassa — ei tehty mitään")
        return 0
    cache = load_cache()
    if not cache:
        print("Välimuistia ei löydy")
        return 1
    if migrate_cache_to_local(cache):
        print("OK — automaatiot siirretty local/-kansioon")
        return 0
    print("Välimuistissa ei automaatiosääntöjä")
    return 1


if __name__ == "__main__":
    sys.exit(main())
