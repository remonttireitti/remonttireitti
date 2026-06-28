"""Sidonta Yellow-pääsilmukkaan — tila ja komennot."""

from __future__ import annotations

from typing import Any, Callable

_get_state: Callable[[], dict[str, Any]] | None = None
_execute_command: Callable[[dict[str, Any]], bool] | None = None
_get_meta: Callable[[], dict[str, Any]] | None = None


def bind(
    *,
    get_state: Callable[[], dict[str, Any]],
    execute_command: Callable[[dict[str, Any]], bool],
    get_meta: Callable[[], dict[str, Any]] | None = None,
) -> None:
    global _get_state, _execute_command, _get_meta
    _get_state = get_state
    _execute_command = execute_command
    _get_meta = get_meta


def snapshot_state() -> dict[str, Any]:
    if _get_state is None:
        return {}
    return _get_state()


def run_command(command: str, payload: dict[str, Any]) -> bool:
    if _execute_command is None:
        return False
    return _execute_command({"command": command, "payload": payload})


def meta() -> dict[str, Any]:
    if _get_meta is None:
        return {}
    return _get_meta()
