import {
  applyQuestionAnswers,
  applyTierOverrides,
  calculateEstimate,
  formatEuro,
} from "./math";
import { vatLabelInParens, CONSUMER_VAT } from "@/lib/vat-label";
import type { CalculatorConfig, CalculatorLineItem, ResolvedEstimate } from "./types";

const DEFAULT_RANGE = { lowMultiplier: 0.9, highMultiplier: 1.15 };

export function getEstimateRange(config: CalculatorConfig) {
  return config.estimateRange ?? DEFAULT_RANGE;
}

function defaultAnswers(config: CalculatorConfig): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const q of config.questions ?? []) {
    answers[q.id] = q.defaultOptionId;
  }
  return answers;
}

function defaultLineItems(config: CalculatorConfig) {
  const tier = config.tiers?.find((t) => t.id === config.defaultTierId) ?? config.tiers?.[0];
  let items = tier
    ? applyTierOverrides(structuredClone(config.lineItems), tier.overrides)
    : structuredClone(config.lineItems);

  if (config.questions?.length) {
    const { items: adjusted, fixedAdd } = applyConfiguredQuestions(
      items,
      config,
      defaultAnswers(config),
      "quick",
    );
    items = adjusted;
    return { items, fixedAdd };
  }

  return { items, fixedAdd: 0 };
}

export function resolveDefaultEstimate(config: CalculatorConfig): ResolvedEstimate {
  const primaryQty = config.primaryInput.defaultValue;
  const secondaryQty = config.secondaryInput?.defaultValue ?? 0;
  const { items, fixedAdd } = defaultLineItems(config);
  const { total: lineTotal } = calculateEstimate(primaryQty, secondaryQty, items);
  const total = lineTotal + fixedAdd;
  const range = getEstimateRange(config);

  const low = Math.round(total * range.lowMultiplier);
  const high = Math.round(total * range.highMultiplier);

  const perUnitMid = primaryQty > 0 ? Math.round(total / primaryQty) : undefined;
  const perUnitLow =
    perUnitMid != null ? Math.round(perUnitMid * range.lowMultiplier) : undefined;
  const perUnitHigh =
    perUnitMid != null ? Math.round(perUnitMid * range.highMultiplier) : undefined;

  return {
    total,
    low,
    high,
    perUnitLow,
    perUnitHigh,
    perUnitMid,
    primaryQty,
    primaryUnit: config.primaryInput.unit,
  };
}

export function resolveEstimateRange(
  config: CalculatorConfig,
  total: number,
  primaryQty: number,
): Pick<ResolvedEstimate, "low" | "high" | "perUnitLow" | "perUnitHigh" | "perUnitMid"> {
  const range = getEstimateRange(config);
  const low = Math.round(total * range.lowMultiplier);
  const high = Math.round(total * range.highMultiplier);
  const perUnitMid = primaryQty > 0 ? Math.round(total / primaryQty) : undefined;
  const perUnitLow =
    perUnitMid != null ? Math.round(perUnitMid * range.lowMultiplier) : undefined;
  const perUnitHigh =
    perUnitMid != null ? Math.round(perUnitMid * range.highMultiplier) : undefined;
  return { low, high, perUnitLow, perUnitHigh, perUnitMid };
}

type PricingTokens = {
  totalLow: string;
  totalMid: string;
  totalHigh: string;
  totalRange: string;
  perUnitLow: string;
  perUnitMid: string;
  perUnitHigh: string;
  perUnitRange: string;
  primaryQty: string;
  primaryUnit: string;
  defaultSize: string;
};

function buildPricingTokens(estimate: ResolvedEstimate): PricingTokens {
  const perUnitLow = estimate.perUnitLow ?? 0;
  const perUnitMid = estimate.perUnitMid ?? 0;
  const perUnitHigh = estimate.perUnitHigh ?? 0;

  return {
    totalLow: formatEuro(estimate.low),
    totalMid: formatEuro(estimate.total),
    totalHigh: formatEuro(estimate.high),
    totalRange: `${formatEuro(estimate.low)}–${formatEuro(estimate.high)}`,
    perUnitLow: formatEuro(perUnitLow),
    perUnitMid: formatEuro(perUnitMid),
    perUnitHigh: formatEuro(perUnitHigh),
    perUnitRange: `${formatEuro(perUnitLow)}–${formatEuro(perUnitHigh)}`,
    primaryQty: String(estimate.primaryQty),
    primaryUnit: estimate.primaryUnit,
    defaultSize: `${estimate.primaryQty} ${estimate.primaryUnit}`,
  };
}

type LinePricingTokens = {
  low: string;
  mid: string;
  high: string;
  range: string;
  label: string;
  unit: string;
};

function buildLinePricingTokens(config: CalculatorConfig): Record<string, LinePricingTokens> {
  const range = getEstimateRange(config);
  const { items } = defaultLineItems(config);
  const secondaryUnit = config.secondaryInput?.unit ?? "m";
  const primaryUnit = config.primaryInput.unit;
  const out: Record<string, LinePricingTokens> = {};

  for (const item of items) {
    const mid = Math.round(item.amount);
    const low = Math.round(item.amount * range.lowMultiplier);
    const high = Math.round(item.amount * range.highMultiplier);
    const unit =
      item.unit === "per_secondary"
        ? secondaryUnit
        : item.unit === "per_primary"
          ? primaryUnit
          : "";
    out[item.id] = {
      low: formatEuro(low),
      mid: formatEuro(mid),
      high: formatEuro(high),
      range: `${formatEuro(low)}–${formatEuro(high)}`,
      label: item.label,
      unit,
    };
  }
  return out;
}

function fillTemplate(
  text: string,
  tokens: PricingTokens,
  lineTokens: Record<string, LinePricingTokens> = {},
): string {
  const withLines = text.replace(
    /\{line:([\w-]+):(range|mid|low|high|label|unit)\}/g,
    (_, id: string, field: keyof LinePricingTokens) => {
      return lineTokens[id]?.[field] ?? `{line:${id}:${field}}`;
    },
  );
  return withLines.replace(/\{(\w+)\}/g, (_, key: string) => {
    return tokens[key as keyof PricingTokens] ?? `{${key}}`;
  });
}

function showPerUnitNote(config: CalculatorConfig, perUnitMid?: number): boolean {
  return config.primaryInput.unit === "m²" && (perUnitMid ?? 0) >= 10;
}

export function derivePriceRangeNote(config: CalculatorConfig): string {
  const { perUnitMid } = resolveDefaultEstimate(config);

  if (showPerUnitNote(config, perUnitMid)) {
    return `Laskurin oletus ({defaultSize}): {perUnitRange}/{primaryUnit}, kokonaisuus {totalRange} (todennäköisesti noin {totalMid}).`;
  }

  return `Laskurin oletus ({defaultSize}): {totalRange} (todennäköisesti noin {totalMid}).`;
}

export function resolvePriceRangeNote(config: CalculatorConfig): string {
  const template = derivePriceRangeNote(config);
  const tokens = buildPricingTokens(resolveDefaultEstimate(config));
  return fillTemplate(template, tokens);
}

export function resolveFaq(config: CalculatorConfig): { q: string; a: string }[] {
  const tokens = buildPricingTokens(resolveDefaultEstimate(config));
  const lineTokens = buildLinePricingTokens(config);
  return config.faq.map((item) => ({
    q: fillTemplate(item.q, tokens, lineTokens),
    a: fillTemplate(item.a, tokens, lineTokens),
  }));
}

export function resolveCalculatorContent(config: CalculatorConfig) {
  const defaultEstimate = resolveDefaultEstimate(config);
  return {
    defaultEstimate,
    priceRangeNote: resolvePriceRangeNote(config),
    faq: resolveFaq(config),
  };
}

export function formatLivePriceNote(
  config: CalculatorConfig,
  primaryQty: number,
  total: number,
  low: number,
  high: number,
): string {
  const perMid = primaryQty > 0 ? Math.round(total / primaryQty) : 0;

  if (showPerUnitNote(config, perMid) && primaryQty > 0) {
    const perLow = Math.round(low / primaryQty);
    const perHigh = Math.round(high / primaryQty);
    return `${primaryQty} ${config.primaryInput.unit}: ${formatEuro(perLow)}–${formatEuro(perHigh)}/${config.primaryInput.unit}, kokonaisuus ${formatEuro(low)}–${formatEuro(high)} (noin ${formatEuro(total)}) ${vatLabelInParens(CONSUMER_VAT)}.`;
  }
  return `${primaryQty} ${config.primaryInput.unit}: ${formatEuro(low)}–${formatEuro(high)} (noin ${formatEuro(total)}) ${vatLabelInParens(CONSUMER_VAT)}.`;
}

export function applyConfiguredQuestions(
  items: CalculatorLineItem[],
  config: CalculatorConfig,
  answers: Record<string, string>,
  mode: "quick" | "detail",
) {
  if (!config.questions?.length) {
    return { items, fixedAdd: 0 };
  }

  const activeQuestions = config.questions.filter(
    (q) => q.mode === "quick" || mode === "detail",
  );
  return applyQuestionAnswers(items, activeQuestions, answers);
}
