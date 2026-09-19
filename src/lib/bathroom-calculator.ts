/** @deprecated Use @/lib/calculators instead */
export {
  formatEuro,
  googlePriceSearch,
  newCustomLineItem,
  lineItemTotal,
  calculateEstimate as calculateBathroomEstimate,
} from "@/lib/calculators/math";
export type { CalculatorLineItem, CostUnit } from "@/lib/calculators/types";

import { getCalculatorBySlug } from "@/lib/calculators/registry";

const kylpyhuone = getCalculatorBySlug("kylpyhuone")!;

export type TileTier = "perus" | "premium";

export const DEFAULT_FLOOR_SQM = kylpyhuone.primaryInput.defaultValue;

export const TILE_TIER_AMOUNTS: Record<TileTier, number> = {
  perus: 250,
  premium: 500,
};

export function defaultCalculatorLineItems(tileTier: TileTier = "perus") {
  const tier = kylpyhuone.tiers?.find((t) =>
    tileTier === "perus" ? t.id === "perus" : t.id === "premium",
  );
  const items = structuredClone(kylpyhuone.lineItems);
  if (tier) {
    return items.map((item) =>
      item.id in tier.overrides
        ? { ...item, amount: tier.overrides[item.id]! }
        : item,
    );
  }
  return items;
}

export const TYPICAL_BREAKDOWN_5SQM = kylpyhuone.typicalBreakdown ?? [];
