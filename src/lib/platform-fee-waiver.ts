export type PlatformFeeWaiverReason = "subscription" | "beta" | "referral";

export type PlatformFeeResolution = {
  feeCents: number;
  waiverReason: PlatformFeeWaiverReason | null;
};

export function platformFeeWaiverShortLabel(
  reason: PlatformFeeWaiverReason | null | undefined,
): string {
  switch (reason) {
    case "subscription":
      return "Kuukausitilaus — ei per-diili -maksua";
    case "beta":
      return "Beta-etu — ei välitysmaksua";
    case "referral":
      return "Suositteluhyvitys — ei välitysmaksua";
    default:
      return "Ei välitysmaksua";
  }
}

export function platformFeeWaiverContractorMessage(
  reason: PlatformFeeWaiverReason | null | undefined,
): string {
  switch (reason) {
    case "subscription":
      return "Kuukausitilaus — ei välityspalkkiota. Asiakkaan yhteystiedot ovat nyt näkyvissä.";
    case "beta":
      return "Beta-etu: ei välityspalkkiota — asiakkaan yhteystiedot ovat nyt näkyvissä.";
    case "referral":
      return "Suositteluhyvitys: ei välityspalkkiota — asiakkaan yhteystiedot ovat nyt näkyvissä.";
    default:
      return "Ei välityspalkkiota — asiakkaan yhteystiedot ovat nyt näkyvissä.";
  }
}
