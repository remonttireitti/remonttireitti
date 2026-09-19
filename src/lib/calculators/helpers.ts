import type { ProjectAreaSlug } from "@/constants/project-areas";
import {
  buildDefaultPriceFactors,
  buildDefaultQuestions,
  enrichFaqAnswer,
} from "./default-questions";
import { getCustomQuestions } from "./custom-questions";
import type {
  BreakdownSegment,
  CalculatorConfig,
  CalculatorInput,
  CalculatorLineItem,
  CalculatorQuestion,
  CalculatorTier,
  EstimateRange,
  PriceFactor,
} from "./types";

type LineDef = Omit<CalculatorLineItem, "enabled">;

export function calcLines(...defs: LineDef[]): CalculatorLineItem[] {
  return defs.map((d) => ({ ...d, enabled: true }));
}

export function sqmInput(
  label: string,
  defaultValue: number,
  opts?: Partial<CalculatorInput>,
): CalculatorInput {
  return {
    label,
    unit: "m²",
    defaultValue,
    min: 1,
    max: 500,
    step: 0.5,
    ...opts,
  };
}

export function meterInput(
  label: string,
  defaultValue: number,
  opts?: Partial<CalculatorInput>,
): CalculatorInput {
  return {
    label,
    unit: "m",
    defaultValue,
    min: 0,
    max: 300,
    step: 1,
    ...opts,
  };
}

export function countInput(
  label: string,
  defaultValue: number,
  unit: string,
  opts?: Partial<CalculatorInput>,
): CalculatorInput {
  return {
    label,
    unit,
    defaultValue,
    min: 1,
    max: 100,
    step: 1,
    ...opts,
  };
}

const CHART_COLORS = [
  "bg-stone-400",
  "bg-sky-500",
  "bg-sky-700",
  "bg-orange-400",
  "bg-orange-600",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-400",
  "bg-teal-500",
] as const;

export function breakdownFromLines(
  lines: LineDef[],
  primaryQty: number,
): BreakdownSegment[] {
  return lines.map((line, i) => {
    let amount = line.amount;
    if (line.unit === "per_primary") {
      amount = line.minAmount
        ? Math.max(line.minAmount, line.amount * primaryQty)
        : line.amount * primaryQty;
    }
    return {
      label: line.label,
      amount: Math.round(amount),
      color: CHART_COLORS[i % CHART_COLORS.length]!,
    };
  });
}

type BuildCalcParams = {
  slug: string;
  jobSlug?: string;
  title: string;
  pageTitle: string;
  metaDescription: string;
  intro: string;
  areaSlug: ProjectAreaSlug | "extra";
  primaryInput: CalculatorInput;
  secondaryInput?: CalculatorInput;
  lines: LineDef[];
  typicalPrimaryQty?: number;
  faq: readonly { q: string; a: string }[];
  scopeTitle: string;
  scopeParagraphs: readonly string[];
  ctaLabel?: string;
  tiers?: CalculatorTier[];
  defaultTierId?: string;
  estimateRange?: EstimateRange;
  questions?: CalculatorQuestion[];
  priceFactors?: PriceFactor[];
};

export function buildCalculator(params: BuildCalcParams): CalculatorConfig {
  const lineItems = calcLines(...params.lines);
  const typicalQty = params.typicalPrimaryQty ?? params.primaryInput.defaultValue;

  const defaultParams = {
    lines: params.lines,
    tiers: params.tiers,
    primaryInputLabel: params.primaryInput.label,
  };

  const custom = getCustomQuestions(params.slug);

  const questions =
    custom?.questions ??
    (params.questions && params.questions.length > 0
      ? params.questions
      : buildDefaultQuestions(defaultParams));

  const priceFactors =
    custom?.priceFactors ??
    (params.priceFactors && params.priceFactors.length > 0
      ? params.priceFactors
      : buildDefaultPriceFactors(defaultParams, questions));

  const faq = params.faq.map((item) => ({
    q: item.q,
    a: enrichFaqAnswer(item.q, item.a, {
      primaryUnit: params.primaryInput.unit,
      lines: params.lines.map((l) => ({ id: l.id, label: l.label, unit: l.unit })),
      secondaryUnit: params.secondaryInput?.unit,
    }),
  }));

  return {
    slug: params.slug,
    jobSlug: params.jobSlug ?? params.slug,
    title: params.title,
    pageTitle: params.pageTitle,
    metaDescription: params.metaDescription,
    intro: params.intro,
    areaSlug: params.areaSlug,
    primaryInput: params.primaryInput,
    secondaryInput: params.secondaryInput,
    tiers: params.tiers,
    defaultTierId: params.defaultTierId,
    lineItems,
    typicalBreakdown: breakdownFromLines(params.lines, typicalQty),
    faq,
    scopeTitle: params.scopeTitle,
    scopeParagraphs: params.scopeParagraphs,
    ctaLabel: params.ctaLabel,
    priceArchiveParam: params.jobSlug ?? params.slug,
    estimateRange: params.estimateRange,
    questions,
    priceFactors,
  };
}
