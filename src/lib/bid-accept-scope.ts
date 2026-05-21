import { bidTotalAmountCents, bidWorkAmountCents } from "@/lib/bid-amounts";
import { formatEurosFromCents } from "@/lib/bids";

export type BidAmountParts = {
  amount_cents: number;
  offers_equipment?: boolean | null;
  equipment_amount_cents?: number | null;
  equipment_description?: string | null;
  accepted_includes_equipment?: boolean | null;
};

export function bidHasSplitEquipmentOffer(
  bid: BidAmountParts,
): boolean {
  return Boolean(
    bid.offers_equipment &&
      bid.equipment_amount_cents != null &&
      bid.equipment_amount_cents > 0,
  );
}

/** Hyväksytty tai tarjottu kokonaissumma asiakkaan valinnan mukaan. */
export function bidResolvedAmountCents(bid: BidAmountParts): number {
  if (!bidHasSplitEquipmentOffer(bid)) {
    return bidTotalAmountCents(bid);
  }
  if (bid.accepted_includes_equipment === false) {
    return bidWorkAmountCents(bid);
  }
  return bidTotalAmountCents(bid);
}

export function formatBidAcceptScopeShort(includesEquipment: boolean): string {
  return includesEquipment ? "Asennus + laite" : "Vain asennus";
}

/** Vertailuun: jaetussa tarjouksessa halvin asennus, muuten kokonaishinta. */
export function bidComparisonAmountCents(bid: BidAmountParts): number {
  if (bidHasSplitEquipmentOffer(bid)) {
    return bidWorkAmountCents(bid);
  }
  return bidResolvedAmountCents(bid);
}

export function formatAcceptedBidSummary(bid: BidAmountParts): string {
  if (!bidHasSplitEquipmentOffer(bid)) {
    return formatEurosFromCents(bidResolvedAmountCents(bid));
  }
  const work = formatEurosFromCents(bidWorkAmountCents(bid));
  const equip = formatEurosFromCents(bid.equipment_amount_cents!);
  const total = formatEurosFromCents(bidTotalAmountCents(bid));
  if (bid.accepted_includes_equipment === true) {
    return `${total} (${work} + laite ${equip})`;
  }
  if (bid.accepted_includes_equipment === false) {
    return `${work} (vain asennus)`;
  }
  return `${work} tai ${total} (asennus + laite)`;
}
