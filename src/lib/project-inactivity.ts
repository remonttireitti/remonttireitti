/** Tarjousaika julkaisusta (päivää). */
export const PROJECT_BID_WINDOW_DAYS = 14;

/** Lisäaika tarjousajan jälkeen ennen automaattista sulkemista (päivää). */
export const PROJECT_INACTIVITY_GRACE_DAYS = 14;

/** Varoitus ennen automaattista sulkemista (päivää). */
export const PROJECT_INACTIVITY_WARNING_DAYS = 7;

export const PROJECT_AUTO_CLOSE_REJECTION_MESSAGE =
  "Tarjouspyyntö suljettiin automaattisesti, koska sitä ei päivitetty tai suljettu ajoissa.";

export const PROJECT_INACTIVITY_STATUSES = [
  "published",
  "receiving_bids",
] as const;

export type ProjectInactivityStatus =
  (typeof PROJECT_INACTIVITY_STATUSES)[number];

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Tarjousajan päättymisaika (julkaisu + ikkuna tai bid_deadline). */
export function projectBidWindowEndsAt(project: {
  bid_deadline: string | null;
  published_at: string | null;
}): Date | null {
  if (project.bid_deadline) {
    return new Date(project.bid_deadline);
  }
  if (project.published_at) {
    return addDays(new Date(project.published_at), PROJECT_BID_WINDOW_DAYS);
  }
  return null;
}

/** Automaattisen sulkemisen ajankohta. */
export function projectAutoCloseAt(project: {
  bid_deadline: string | null;
  published_at: string | null;
}): Date | null {
  const bidEnds = projectBidWindowEndsAt(project);
  if (!bidEnds) return null;
  return addDays(bidEnds, PROJECT_INACTIVITY_GRACE_DAYS);
}

/** Varoitusilmoituksen ajankohta. */
export function projectInactivityWarningAt(project: {
  bid_deadline: string | null;
  published_at: string | null;
}): Date | null {
  const closeAt = projectAutoCloseAt(project);
  if (!closeAt) return null;
  return addDays(closeAt, -PROJECT_INACTIVITY_WARNING_DAYS);
}

export function daysUntilAutoClose(project: {
  bid_deadline: string | null;
  published_at: string | null;
}): number | null {
  const closeAt = projectAutoCloseAt(project);
  if (!closeAt) return null;
  const ms = closeAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function formatAutoCloseDateFi(project: {
  bid_deadline: string | null;
  published_at: string | null;
}): string | null {
  const closeAt = projectAutoCloseAt(project);
  if (!closeAt) return null;
  return closeAt.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function shouldShowInactivityWarning(project: {
  status: string;
  bid_deadline: string | null;
  published_at: string | null;
  inactivity_warning_sent_at?: string | null;
}): boolean {
  if (
    !PROJECT_INACTIVITY_STATUSES.includes(
      project.status as ProjectInactivityStatus,
    )
  ) {
    return false;
  }
  const warningAt = projectInactivityWarningAt(project);
  const closeAt = projectAutoCloseAt(project);
  if (!warningAt || !closeAt) return false;
  const now = Date.now();
  return now >= warningAt.getTime() && now < closeAt.getTime();
}

export function extendBidDeadlineFromNow(): string {
  return addDays(new Date(), PROJECT_BID_WINDOW_DAYS).toISOString();
}
