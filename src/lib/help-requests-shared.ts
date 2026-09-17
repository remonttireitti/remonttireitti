import type { HelpCategoryId, HelpLocationType } from "@/lib/help-categories";

export type HelpRequestStatus = "open" | "matched" | "done" | "cancelled" | "expired";
export type HelpOfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "completed";
export type HelpCompletionStatus =
  | "pending_requester"
  | "confirmed"
  | "rejected"
  | "expired";

export type HelpRequestRow = {
  id: string;
  requester_id: string;
  title: string;
  description: string;
  category: HelpCategoryId | string;
  postal_code: string;
  municipality: string;
  location_type: HelpLocationType;
  people_needed: number;
  urgency: "normal" | "now";
  window_start: string | null;
  window_end: string | null;
  status: HelpRequestStatus;
  accepted_offer_id: string | null;
  expires_at: string;
  created_at: string;
};

export type HelpOfferRow = {
  id: string;
  request_id: string;
  helper_id: string;
  helper_kind: "individual" | "company";
  helper_display_name: string;
  message: string;
  status: HelpOfferStatus;
  created_at: string;
};

export type HelpCompletionRow = {
  id: string;
  request_id: string;
  offer_id: string;
  helper_id: string;
  requester_id: string;
  helper_confirmed_at: string;
  requester_confirmed_at: string | null;
  requester_rejected: boolean;
  status: HelpCompletionStatus;
};

export type HelpRequestWithDistance = HelpRequestRow & {
  distance_km: number | null;
};

export function formatHelpDistance(km: number | null): string {
  if (km == null) return "";
  if (km < 1) return "alle 1 km";
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export function formatHelpWindow(
  windowStart: string | null,
  windowEnd: string | null,
): string {
  if (!windowStart && !windowEnd) return "Sopimuksen mukaan";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("fi-FI", {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (windowStart && windowEnd) return `${fmt(windowStart)} – ${fmt(windowEnd)}`;
  if (windowStart) return `Alkaen ${fmt(windowStart)}`;
  return `Viimeistään ${fmt(windowEnd!)}`;
}

export function freeHelpTitle(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "Olet auttanut kerran ilmaiseksi";
  return `Olet auttanut ${count} kertaa ilmaiseksi`;
}
