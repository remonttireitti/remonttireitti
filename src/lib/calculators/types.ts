import type { ProjectAreaSlug } from "@/constants/project-areas";

export type CostUnit = "fixed" | "per_primary" | "per_secondary";

export type CalculatorLineItem = {
  id: string;
  label: string;
  description: string;
  unit: CostUnit;
  /** €/yksikkö tai kiinteä € */
  amount: number;
  minAmount?: number;
  enabled: boolean;
  searchHint?: string;
  custom?: boolean;
};

export type CalculatorInput = {
  label: string;
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  hint?: string;
};

export type CalculatorTier = {
  id: string;
  label: string;
  subtitle?: string;
  /** Rivikohtaiset hintamuutokset (rivin id → €) */
  overrides: Record<string, number>;
};

export type BreakdownSegment = {
  label: string;
  amount: number;
  color: string;
};

export type EstimateRange = {
  lowMultiplier: number;
  highMultiplier: number;
};

export type QuestionOptionEffect = {
  lineMultipliers?: Record<string, number>;
  lineAmounts?: Record<string, number>;
  lineEnabled?: Record<string, boolean>;
  fixedAdd?: number;
};

export type CalculatorQuestionOption = {
  id: string;
  label: string;
  effect?: QuestionOptionEffect;
};

export type CalculatorQuestion = {
  id: string;
  label: string;
  hint?: string;
  mode: "quick" | "detail";
  defaultOptionId: string;
  options: CalculatorQuestionOption[];
};

export type PriceFactorStatus = "included" | "variable";

export type PriceFactor = {
  label: string;
  status: PriceFactorStatus;
  /** Näytetään detail-tilassa, kun näitä kysymyksiä ei ole vielä vastattu */
  questionIds?: string[];
};

export type CalculatorConfig = {
  slug: string;
  jobSlug: string;
  title: string;
  pageTitle: string;
  metaDescription: string;
  intro: string;
  areaSlug: ProjectAreaSlug | "extra";
  primaryInput: CalculatorInput;
  secondaryInput?: CalculatorInput;
  tiers?: CalculatorTier[];
  defaultTierId?: string;
  lineItems: CalculatorLineItem[];
  typicalBreakdown?: readonly BreakdownSegment[];
  faq: readonly { q: string; a: string }[];
  scopeTitle: string;
  scopeParagraphs: readonly string[];
  ctaLabel?: string;
  priceArchiveParam?: string;
  estimateRange?: EstimateRange;
  questions?: CalculatorQuestion[];
  priceFactors?: PriceFactor[];
};

export type ResolvedEstimate = {
  total: number;
  low: number;
  high: number;
  perUnitLow?: number;
  perUnitHigh?: number;
  perUnitMid?: number;
  primaryQty: number;
  primaryUnit: string;
};
