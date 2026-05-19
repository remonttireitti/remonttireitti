import { formatEurosFromCents } from "@/lib/bids";

export type CounterOfferStatus = "pending" | "accepted" | "declined";

export type BidCounterFields = {
  counter_amount_cents: number | null;
  counter_message: string | null;
  counter_offered_at: string | null;
  counter_status: CounterOfferStatus | null;
};

export function hasPendingCounterOffer(bid: BidCounterFields): boolean {
  return bid.counter_status === "pending" && bid.counter_amount_cents != null;
}

export function formatCounterOfferStatus(bid: BidCounterFields): string | null {
  if (!bid.counter_amount_cents || !bid.counter_status) return null;
  const amount = formatEurosFromCents(bid.counter_amount_cents);
  switch (bid.counter_status) {
    case "pending":
      return `${amount} — odottaa urakoitsijan vastausta`;
    case "accepted":
      return `${amount} — urakoitsija hyväksyi, hinta päivitetty`;
    case "declined":
      return `${amount} — urakoitsija hylkäsi`;
    default:
      return null;
  }
}

export const counterOfferStatusLabels: Record<CounterOfferStatus, string> = {
  pending: "Vastatarjous odottaa",
  accepted: "Vastatarjous hyväksytty",
  declined: "Vastatarjous hylätty",
};
