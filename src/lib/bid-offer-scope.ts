export type BidOfferScope = "turnkey" | "own_trade";

export const BID_OFFER_SCOPE_LABELS: Record<BidOfferScope, string> = {
  turnkey: "Kokonaisurakka",
  own_trade: "Vain oman ammattini osuus",
};

export function parseBidOfferScope(
  raw: string | null | undefined,
): BidOfferScope | null {
  if (raw === "turnkey" || raw === "own_trade") return raw;
  return null;
}

export function formatBidOfferScopeLabel(
  scope: BidOfferScope | null | undefined,
  contractorTradeNames?: string[],
): string | null {
  if (!scope) return null;
  if (scope === "turnkey") {
    return BID_OFFER_SCOPE_LABELS.turnkey;
  }
  if (contractorTradeNames && contractorTradeNames.length > 0) {
    return `${BID_OFFER_SCOPE_LABELS.own_trade} (${contractorTradeNames.join(", ")})`;
  }
  return BID_OFFER_SCOPE_LABELS.own_trade;
}

export function bidOfferScopeAmountLabel(
  scope: BidOfferScope | null,
  isMultiTrade: boolean,
  allowOptionalEquipmentOffer: boolean,
  requiresDeviceAndInstallation: boolean,
): string {
  if (allowOptionalEquipmentOffer && !requiresDeviceAndInstallation) {
    return scope === "own_trade" && isMultiTrade
      ? "Oman ammattisi osuuden hinta (€, sis. ALV) *"
      : scope === "turnkey" && isMultiTrade
        ? "Kokonaisurakan hinta (€, sis. ALV) *"
        : "Asennus ja työ (€, sis. ALV) *";
  }
  if (scope === "own_trade" && isMultiTrade) {
    return "Oman ammattisi osuuden hinta (€, sis. ALV) *";
  }
  if (scope === "turnkey" && isMultiTrade) {
    return "Kokonaisurakan hinta (€, sis. ALV) *";
  }
  return "Hintasi (€, sis. ALV) *";
}
