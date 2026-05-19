import type { BidStatus } from "@/types/database";

export const bidStatusLabels: Record<BidStatus, string> = {
  draft: "Luonnos",
  submitted: "Lähetetty",
  accepted: "Hyväksytty",
  rejected: "Hylätty",
  withdrawn: "Peruttu",
};

export function formatEurosFromCents(cents: number): string {
  return `${(cents / 100).toLocaleString("fi-FI", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
}

export function getBidContractorName(
  profiles: { company_name: string } | { company_name: string }[] | null,
): string {
  if (!profiles) return "Urakoitsija";
  if (Array.isArray(profiles)) return profiles[0]?.company_name ?? "Urakoitsija";
  return profiles.company_name;
}

const STATUS_SORT: Record<BidStatus, number> = {
  accepted: 0,
  submitted: 1,
  draft: 2,
  rejected: 3,
  withdrawn: 4,
};

/** Hyväksytty ensin, sitten halvin hinta. */
export function sortBidsForComparison<T extends { status: BidStatus; amount_cents: number }>(
  bids: T[],
): T[] {
  return [...bids].sort((a, b) => {
    const sd = STATUS_SORT[a.status] - STATUS_SORT[b.status];
    if (sd !== 0) return sd;
    return a.amount_cents - b.amount_cents;
  });
}
