import { payPerDealFeeCents } from "@/lib/platform-fee";

/** Oletus: ensimmäiset 3 hyväksyttyä diiliä ilman välityspalkkiota. Poista: PLATFORM_FEE_BETA_FREE_DEALS=0 */
export function platformFeeBetaFreeDealsLimit(): number {
  const raw = process.env.PLATFORM_FEE_BETA_FREE_DEALS?.trim();
  if (raw === "0" || raw === "false" || raw === "off") return 0;
  if (raw) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return 3;
}

export function isPlatformFeeBetaActive(): boolean {
  return platformFeeBetaFreeDealsLimit() > 0;
}

export function platformFeeBetaPromoTitle(): string | null {
  const limit = platformFeeBetaFreeDealsLimit();
  if (limit <= 0) return null;
  return `Ensimmäiset ${limit} hyväksyttyä diiliä ilman palkkiota (maksu per diili -mallissa)`;
}

export function platformFeeBetaPromoBody(): string | null {
  const limit = platformFeeBetaFreeDealsLimit();
  if (limit <= 0) return null;
  return `Tarjousten jättäminen on maksutonta. Maksu per diili -mallissa ensimmäiset ${limit} hyväksyttyä diiliä ovat 0 € — yhteystiedot avautuvat heti. Kuukausitilauksessa ei per-diili -maksuja.`;
}

export function contractorBetaFreeDealsRemaining(priorInvoiceCount: number): number {
  return Math.max(0, platformFeeBetaFreeDealsLimit() - priorInvoiceCount);
}

export function qualifiesForPlatformFeeBetaWaiver(
  priorInvoiceCount: number,
): boolean {
  return (
    isPlatformFeeBetaActive() &&
    priorInvoiceCount < platformFeeBetaFreeDealsLimit()
  );
}

export function resolvePlatformFeeCentsForContractor(params: {
  priorInvoiceCount: number;
  hasActiveSubscription: boolean;
}): number {
  if (params.hasActiveSubscription) return 0;
  if (qualifiesForPlatformFeeBetaWaiver(params.priorInvoiceCount)) return 0;
  return payPerDealFeeCents();
}
