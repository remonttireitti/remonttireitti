import type { HubControlMode, HubState } from "@/lib/types";

export const TIMED_MODE_STEP_MS = 15 * 60 * 1000;

export type TimedModeKind = "fireplace" | "hood" | "away";

export function extendUntil(
  existing: string | null | undefined,
  addMs: number,
  now = Date.now(),
): string {
  const base = existing ? Math.max(now, new Date(existing).getTime()) : now;
  return new Date(base + addMs).toISOString();
}

export function remainingMs(
  until: string | null | undefined,
  now = Date.now(),
): number | null {
  if (!until) return null;
  const ms = new Date(until).getTime() - now;
  return ms > 0 ? ms : 0;
}

export function formatRemaining(ms: number): string {
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function expireTimedModes(state: HubState, now = Date.now()): HubState {
  const next = { ...state };
  if (next.fireplace_until && new Date(next.fireplace_until).getTime() <= now) {
    next.fireplace_until = null;
  }
  if (next.hood_until && new Date(next.hood_until).getTime() <= now) {
    next.hood_until = null;
  }
  if (
    !next.away_unlimited &&
    next.away_until &&
    new Date(next.away_until).getTime() <= now
  ) {
    next.away_until = null;
    next.away_mode = false;
  }
  return next;
}

export function effectiveControlMode(
  controlMode: HubControlMode,
  state: HubState,
  now = Date.now(),
): HubControlMode {
  const s = expireTimedModes(state, now);
  if (remainingMs(s.fireplace_until, now)) return "fireplace";
  if (remainingMs(s.hood_until, now)) return "hood";
  if (controlMode === "manual") return "manual";
  return "auto";
}

export function activeTimedMode(
  state: HubState,
  now = Date.now(),
): TimedModeKind | null {
  const s = expireTimedModes(state, now);
  if (remainingMs(s.fireplace_until, now)) return "fireplace";
  if (remainingMs(s.hood_until, now)) return "hood";
  if (s.away_unlimited || remainingMs(s.away_until, now)) return "away";
  return null;
}

export function timedModeLabel(kind: TimedModeKind): string {
  switch (kind) {
    case "fireplace":
      return "Takkatila";
    case "hood":
      return "Liesituuletin";
    case "away":
      return "Poissa";
  }
}
