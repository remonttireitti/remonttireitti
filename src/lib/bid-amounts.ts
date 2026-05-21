export type BidAmountFields = {
  amount_cents: number;
  offers_equipment?: boolean | null;
  equipment_amount_cents?: number | null;
};

/** Asennus / työ (ilman laitetta). */
export function bidWorkAmountCents(bid: Pick<BidAmountFields, "amount_cents">): number {
  return bid.amount_cents;
}

/** Tarjouksen kokonaishinta (työ + valinnainen laite). */
export function bidTotalAmountCents(bid: BidAmountFields): number {
  const equipment =
    bid.offers_equipment && bid.equipment_amount_cents
      ? bid.equipment_amount_cents
      : 0;
  return bid.amount_cents + equipment;
}
