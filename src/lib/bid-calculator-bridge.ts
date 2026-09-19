import { applyTierOverrides, type CalculatedLine } from "@/lib/calculators/math";
import {
  attachReferenceAmounts,
  applyContractorRatesToLines,
  contractorOverheadLines,
  type ContractorPricingRates,
} from "@/lib/calculators/contractor-pricing";
import type { CalculatorConfig, CalculatorLineItem } from "@/lib/calculators/types";
import type {
  BidCostBreakdown,
  BidProfitabilitySummary,
} from "@/lib/bid-profitability";
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
  profitability?: {
    costs: BidCostBreakdown;
    summary: BidProfitabilitySummary;
  };
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

export type CustomerCalculatorEstimate = {
  totalEuros?: number;
  lowEuros?: number;
  highEuros?: number;
  primaryQty?: number;
  primaryUnit?: string;
  title?: string;
};

/** Syötteet tarjouspyynnön laskuriarvioista urakoitsijan laskurille. */
export type ProjectCalculatorInputHints = {
  primaryQty?: number;
  secondaryQty?: number;
  tierId?: string;
  answers?: Record<string, string>;
  estimateMode?: "quick" | "detail";
  customerEstimate?: CustomerCalculatorEstimate | null;
};

function parseSqmFromText(text: string): number | undefined {
  const sqmMatch = text.match(/(\d+(?:[.,]\d+)?)\s*m²/i);
  if (!sqmMatch) return undefined;
  const value = Number.parseFloat(sqmMatch[1]!.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function parseCalculatorEstimate(
  details: unknown,
): Record<string, unknown> | null {
  if (!details || typeof details !== "object") return null;
  const estimate = (details as Record<string, unknown>).calculator_estimate;
  if (!estimate || typeof estimate !== "object") return null;
  return estimate as Record<string, unknown>;
}

/** Poimi laskurin syötteet ja asiakkaan arvio tarjouspyynnöstä. */
export function hintsFromProject(
  input: ProjectCalculatorHints,
): ProjectCalculatorInputHints {
  const estimate = parseCalculatorEstimate(input.details);
  const result: ProjectCalculatorInputHints = {};

  if (input.primaryQty != null && input.primaryQty > 0) {
    result.primaryQty = input.primaryQty;
  }

  if (estimate) {
    const primaryQty = estimate.primary_qty;
    if (typeof primaryQty === "number" && primaryQty > 0) {
      result.primaryQty = primaryQty;
    }
    const secondaryQty = estimate.secondary_qty;
    if (typeof secondaryQty === "number" && secondaryQty >= 0) {
      result.secondaryQty = secondaryQty;
    }
    const tierId = estimate.tier_id;
    if (typeof tierId === "string" && tierId) {
      result.tierId = tierId;
    }
    const answers = estimate.answers;
    if (answers && typeof answers === "object" && !Array.isArray(answers)) {
      result.answers = answers as Record<string, string>;
    }
    const estimateMode = estimate.estimate_mode;
    if (estimateMode === "quick" || estimateMode === "detail") {
      result.estimateMode = estimateMode;
    }

    const totalEuros = estimate.total_euros;
    const lowEuros = estimate.low_euros;
    const highEuros = estimate.high_euros;
    if (
      typeof totalEuros === "number" ||
      typeof lowEuros === "number" ||
      typeof highEuros === "number"
    ) {
      result.customerEstimate = {
        totalEuros: typeof totalEuros === "number" ? totalEuros : undefined,
        lowEuros: typeof lowEuros === "number" ? lowEuros : undefined,
        highEuros: typeof highEuros === "number" ? highEuros : undefined,
        primaryQty:
          typeof primaryQty === "number" && primaryQty > 0 ? primaryQty : undefined,
        primaryUnit:
          typeof estimate.primary_unit === "string"
            ? estimate.primary_unit
            : undefined,
        title:
          typeof estimate.title === "string" ? estimate.title : undefined,
      };
    }
  }

  if (result.primaryQty == null) {
    const detailsText =
      input.details && typeof input.details === "object"
        ? JSON.stringify(input.details)
        : "";
    const text = [input.title ?? "", input.description ?? "", detailsText].join(
      "\n",
    );
    const fromText = parseSqmFromText(text);
    if (fromText) result.primaryQty = fromText;
  }

  return result;
}

export function calculatorMetaNote(config: CalculatorConfig): string {
  return `Laskettu Remonttireitin tarjouslaskurilla (${config.title}).`;
}

/** Alusta laskurin syötteet tarjouspyynnön tiedoista. */
export function calculatorInputsFromProjectHints(
  config: CalculatorConfig,
  hints: ProjectCalculatorInputHints,
): {
  primaryQty: number;
  secondaryQty: number;
  tierId: string | undefined;
  answers: Record<string, string>;
  estimateMode: "quick" | "detail";
} {
  const defaultTier = config.defaultTierId ?? config.tiers?.[0]?.id;
  const answers: Record<string, string> = {};
  for (const q of config.questions ?? []) {
    answers[q.id] = hints.answers?.[q.id] ?? q.defaultOptionId;
  }
  const tierValid =
    hints.tierId && config.tiers?.some((t) => t.id === hints.tierId);
  return {
    primaryQty: hints.primaryQty ?? config.primaryInput.defaultValue,
    secondaryQty:
      hints.secondaryQty ?? config.secondaryInput?.defaultValue ?? 0,
    tierId: tierValid ? hints.tierId : defaultTier,
    answers,
    estimateMode: hints.estimateMode ?? "quick",
  };
}

export function buildInitialContractorLineItems(
  config: CalculatorConfig,
  tierId: string | undefined,
  rates: ContractorPricingRates,
): CalculatorLineItem[] {
  const tier = config.tiers?.find((t) => t.id === tierId);
  const base = tier
    ? applyTierOverrides(structuredClone(config.lineItems), tier.overrides)
    : structuredClone(config.lineItems);
  const withRefs = attachReferenceAmounts(base);
  const withOverhead = [...withRefs, ...contractorOverheadLines(rates)];
  return applyContractorRatesToLines(withOverhead, rates);
}
