/** Passiivisuus ennen automaattista uloskirjautumista (30 min). */
export const SESSION_IDLE_MS = 30 * 60 * 1000;

/** Avoimien välilehtien syke — tunnistaa viimeisen sulkeutuvan välilehden. */
export const SESSION_TAB_HEARTBEAT_MS = 10_000;

/** Välilehti katsotaan suljetuksi jos sykettä ei ole tähän asti. */
export const SESSION_TAB_STALE_MS = 20_000;

const TAB_ID_KEY = "rr_tab_id";
const LAST_ACTIVITY_KEY = "rr_last_activity";
const OPEN_TABS_KEY = "rr_open_tabs";

export type SessionLogoutReason = "idle" | "suljettu";

function readOpenTabs(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OPEN_TABS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOpenTabs(tabs: Record<string, number>) {
  localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(tabs));
}

function pruneStaleTabs(tabs: Record<string, number>, now = Date.now()) {
  const next: Record<string, number> = {};
  for (const [id, seenAt] of Object.entries(tabs)) {
    if (now - seenAt <= SESSION_TAB_STALE_MS) {
      next[id] = seenAt;
    }
  }
  return next;
}

export function getOrCreateTabId(): string {
  let id = sessionStorage.getItem(TAB_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tab_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(TAB_ID_KEY, id);
  }
  return id;
}

export function touchSessionActivity(now = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
}

export function getLastSessionActivity(): number | null {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function isSessionIdle(now = Date.now()): boolean {
  const last = getLastSessionActivity();
  if (last == null) return false;
  return now - last >= SESSION_IDLE_MS;
}

export function registerOpenTab(tabId: string, now = Date.now()) {
  const tabs = pruneStaleTabs(readOpenTabs(), now);
  tabs[tabId] = now;
  writeOpenTabs(tabs);
  touchSessionActivity(now);
}

export function heartbeatOpenTab(tabId: string, now = Date.now()) {
  const tabs = pruneStaleTabs(readOpenTabs(), now);
  tabs[tabId] = now;
  writeOpenTabs(tabs);
}

export function unregisterOpenTab(tabId: string, now = Date.now()) {
  const tabs = pruneStaleTabs(readOpenTabs(), now);
  delete tabs[tabId];
  writeOpenTabs(tabs);
  return Object.keys(tabs).length;
}

export function loginRedirectForReason(reason: SessionLogoutReason): string {
  return `/kirjaudu?reason=${reason}`;
}
