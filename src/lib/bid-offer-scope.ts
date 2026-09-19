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

import { bidAmountFieldLabel } from "@/lib/vat-label";

export function bidOfferScopeAmountLabel(
  scope: BidOfferScope | null,
  isMultiTrade: boolean,
  allowOptionalEquipmentOffer: boolean,
  requiresDeviceAndInstallation: boolean,
  vatIncluded = true,
): string {
  if (allowOptionalEquipmentOffer && !requiresDeviceAndInstallation) {
    return scope === "own_trade" && isMultiTrade
      ? bidAmountFieldLabel("Oman ammattisi osuuden hinta", vatIncluded)
      : scope === "turnkey" && isMultiTrade
        ? bidAmountFieldLabel("Kokonaisurakan hinta", vatIncluded)
        : bidAmountFieldLabel("Asennus ja työ", vatIncluded);
  }
  if (scope === "own_trade" && isMultiTrade) {
    return bidAmountFieldLabel("Oman ammattisi osuuden hinta", vatIncluded);
  }
  if (scope === "turnkey" && isMultiTrade) {
    return bidAmountFieldLabel("Kokonaisurakan hinta", vatIncluded);
  }
  return bidAmountFieldLabel("Hintasi", vatIncluded);
}
