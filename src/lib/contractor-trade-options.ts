import { PUBLIC_CONTRACTOR_TRADE_SLUGS } from "@/constants/contractor-trades";
import type { Trade } from "@/types/job-catalog";

export type SelectableTrade = Pick<Trade, "id" | "slug" | "name_fi" | "source">;

/** Urakoitsijalle valittavissa: oletusammatit + yhteisön lisäämät. */
export function getContractorSelectableTrades(trades: Trade[]): SelectableTrade[] {
  const publicSlugs = new Set<string>(PUBLIC_CONTRACTOR_TRADE_SLUGS);

  return trades
    .filter(
      (t) =>
        publicSlugs.has(t.slug) ||
        t.source === "community",
    )
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      name_fi: t.name_fi,
      source: t.source,
    }))
    .sort((a, b) => {
      const aCommunity = a.source === "community" ? 1 : 0;
      const bCommunity = b.source === "community" ? 1 : 0;
      if (aCommunity !== bCommunity) return aCommunity - bCommunity;
      return a.name_fi.localeCompare(b.name_fi, "fi");
    });
}
