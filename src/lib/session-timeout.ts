/** Passiivisuus ennen automaattista uloskirjautumista (30 min). */
export const SESSION_IDLE_MS = 30 * 60 * 1000;

const LAST_ACTIVITY_KEY = "rr_last_activity";

export type SessionLogoutReason = "idle";

export function touchSessionActivity(now = Date.now()) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {
    /* ignore */
  }
}

export function getLastSessionActivity(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function isSessionIdle(now = Date.now()): boolean {
  const last = getLastSessionActivity();
  if (last == null) return false;
  return now - last >= SESSION_IDLE_MS;
}

export function loginRedirectForReason(reason: SessionLogoutReason): string {
  return `/kirjaudu?reason=${reason}`;
}
