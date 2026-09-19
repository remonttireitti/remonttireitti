import type { CalculatedLine } from "@/lib/calculators/math";
import type { CalculatorConfig } from "@/lib/calculators/types";
import {
  mergeScopeLines,
  newScopeLineId,
  type BidScopeLine,
} from "@/lib/bid-scope-lines";

export type BidCalculatorResult = {
  subtotal: number;
  totalWithMargin: number;
  marginPercent: number;
  lines: CalculatedLine[];
  primaryQty: number;
  calculatorSlug: string;
  /** Urakoitsijan ehdotukset lisätöiksi — kerätään oppimiseen. */
  suggestedAddons: string[];
  /** Puuttuvat tiedot — kerätään oppimiseen. */
  suggestedInfoNeeds: string[];
  suggestForFutureRequests: boolean;
};

/** Muodosta vertailukelpoiset laajuusrivit tarjouslomakkeeseen. */
export function scopeLinesFromCalculatorResult(
  result: BidCalculatorResult,
  existingLines: BidScopeLine[],
): BidScopeLine[] {
  const fromCalc: BidScopeLine[] = result.lines
    .filter((l) => l.enabled && l.amount > 0)
    .map((l) => ({
      id: newScopeLineId(),
      label: l.label,
      value: `${l.amount.toLocaleString("fi-FI")} €`,
      itemId: `calc-${l.id}`,
    }));

  fromCalc.push({
    id: newScopeLineId(),
    label: "Kate",
    value: `${result.marginPercent} % (sisältyy kokonaishintaan)`,
    itemId: "calc-margin",
  });

  return mergeScopeLines(existingLines, fromCalc, "append");
}

/** Etsi laskurista sopiva slug työlajille. */
export function calculatorSlugForJob(jobTypeSlug: string | null | undefined): string | null {
  if (!jobTypeSlug) return null;
  const aliases: Record<string, string> = {
    kattoremontti: "katto-pelti",
    kylpyhuoneremontti: "kylpyhuone",
    keittioremontti: "keittio",
    maalaus: "seinamaalaus",
  };
  return aliases[jobTypeSlug] ?? jobTypeSlug;
}

export type ProjectCalculatorHints = {
  primaryQty?: number;
  municipality?: string | null;
  title?: string;
  description?: string | null;
  details?: unknown;
};

function parseSqmFromText(text: string): number | undefined {
  const sqmMatch = text.match(/(\d+(?:[.,]\d+)?)\s*m²/i);
  if (!sqmMatch) return undefined;
  const value = Number.parseFloat(sqmMatch[1]!.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Yritä poimia pinta-ala / määrä tarjouspyynnön tiedoista. */
export function hintsFromProject(input: ProjectCalculatorHints): {
  primaryQty?: number;
} {
  if (input.primaryQty != null && input.primaryQty > 0) {
    return { primaryQty: input.primaryQty };
  }

  const detailsText =
    input.details && typeof input.details === "object"
      ? JSON.stringify(input.details)
      : "";

  const text = [input.title ?? "", input.description ?? "", detailsText].join(
    "\n",
  );
  const fromText = parseSqmFromText(text);
  if (fromText) return { primaryQty: fromText };

  return {};
}

export function calculatorMetaNote(config: CalculatorConfig): string {
  return `Laskettu Remonttireitin tarjouslaskurilla (${config.title}).`;
}
