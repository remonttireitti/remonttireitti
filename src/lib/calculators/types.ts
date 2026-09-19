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
  priceRangeNote?: string;
  ctaLabel?: string;
  priceArchiveParam?: string;
};
