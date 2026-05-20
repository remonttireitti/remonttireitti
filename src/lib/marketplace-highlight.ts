import type { MarketplacePlanSlug } from "@/lib/marketplace-pricing";

export function listingHighlightedForPlanSlug(
  slug: MarketplacePlanSlug | string | null | undefined,
): boolean {
  return slug === "contractor_pro";
}
