import type { CalculatedLine } from "@/lib/calculators/math";
import type { ContractorPricingRates } from "@/lib/calculators/contractor-pricing";
import {
  assessBidFairPrice,
  formatPriceTierSymbols,
  PRICE_TIER_LABELS,
  type JobPriceBenchmark,
  type PriceTier,
} from "@/lib/fair-price-tier";

export type BidCostBreakdown = {
  materials: number;
  labor: number;
  subcontracting: number;
  travelEquipment: number;
  otherDirect: number;
};

export const EMPTY_COST_BREAKDOWN: BidCostBreakdown = {
  materials: 0,
  labor: 0,
  subcontracting: 0,
  travelEquipment: 0,
  otherDirect: 0,
};

export type BidProfitabilitySummary = {
  sellingPrice: number;
  totalCosts: number;
  profit: number;
  profitMarginPercent: number;
  estimatedHours: number | null;
  profitPerHour: number | null;
};

const MATERIAL_PATTERN =
  /materiaal|laatta|laatat|tiili|eriste|levy|putki|kaapeli|purku/i;
const LABOR_PATTERN =
  /työ|tyo|asennus|maalaus|remontti|muur|list|sähkö|sahko|lvi|purkuty/i;
const SUBCONTRACT_PATTERN = /alihankinta|aliurakoitsija|aliurakka/i;
const TRAVEL_IDS = new Set(["matka", "telineet", "jate", "kalusto"]);

function categorizeLine(
  line: CalculatedLine,
): keyof BidCostBreakdown {
  const id = line.id.toLowerCase();
  const label = line.label.toLowerCase();

  if (TRAVEL_IDS.has(id)) return "travelEquipment";
  if (SUBCONTRACT_PATTERN.test(id) || SUBCONTRACT_PATTERN.test(label)) {
    return "subcontracting";
  }
  if (LABOR_PATTERN.test(id) || LABOR_PATTERN.test(label)) return "labor";
  if (MATERIAL_PATTERN.test(id) || MATERIAL_PATTERN.test(label)) {
    return "materials";
  }
  if (id === "jate" || label.includes("jäte")) return "travelEquipment";
  return "otherDirect";
}

/** Jaa laskurin rivit kustannusluokkiin automaattisesti. */
export function suggestCostBreakdownFromLines(
  lines: CalculatedLine[],
  fixedAdd = 0,
): BidCostBreakdown {
  const breakdown = { ...EMPTY_COST_BREAKDOWN };

  for (const line of lines) {
    if (!line.enabled || line.amount <= 0) continue;
    const key = categorizeLine(line);
    breakdown[key] += line.amount;
  }

  if (fixedAdd > 0) {
    breakdown.otherDirect += fixedAdd;
  }

  return breakdown;
}

export function totalCostBreakdown(costs: BidCostBreakdown): number {
  return (
    costs.materials +
    costs.labor +
    costs.subcontracting +
    costs.travelEquipment +
    costs.otherDirect
  );
}

export function computeProfitability(
  sellingPrice: number,
  costs: BidCostBreakdown,
  hourlyRate: number,
): BidProfitabilitySummary {
  const totalCosts = totalCostBreakdown(costs);
  const profit = Math.round(sellingPrice - totalCosts);
  const profitMarginPercent =
    sellingPrice > 0
      ? Math.round((profit / sellingPrice) * 1000) / 10
      : 0;

  let estimatedHours: number | null = null;
  if (hourlyRate > 0 && costs.labor > 0) {
    estimatedHours = Math.round((costs.labor / hourlyRate) * 10) / 10;
  }

  const profitPerHour =
    estimatedHours != null && estimatedHours > 0
      ? Math.round((profit / estimatedHours) * 100) / 100
      : null;

  return {
    sellingPrice,
    totalCosts,
    profit,
    profitMarginPercent,
    estimatedHours,
    profitPerHour,
  };
}

export type TypicalBidRange = {
  lowEuros: number;
  highEuros: number;
  label: string;
};

/** Muunna poikkeamabenchmark absoluuttiseksi hintahaaruakaksi. */
export function typicalBidRangeFromBenchmark(
  estimateEuros: number,
  benchmark: JobPriceBenchmark | null,
): TypicalBidRange | null {
  if (!estimateEuros || estimateEuros <= 0 || !benchmark) return null;
  if (benchmark.sampleCount < 5) return null;

  const low = Math.round(estimateEuros * (1 + benchmark.p25 / 100));
  const high = Math.round(estimateEuros * (1 + benchmark.p75 / 100));
  const min = Math.min(low, high);
  const max = Math.max(low, high);

  return {
    lowEuros: min,
    highEuros: max,
    label: `${min.toLocaleString("fi-FI")}–${max.toLocaleString("fi-FI")} €`,
  };
}

export type ProfitabilityMarketInsight = {
  tier: PriceTier;
  symbols: string;
  tierLabel: string;
  vsTypicalPercent: number | null;
  typicalRange: TypicalBidRange | null;
  advisory: string | null;
  profitability: BidProfitabilitySummary;
};

export function buildProfitabilityMarketInsight(input: {
  sellingPrice: number;
  costs: BidCostBreakdown;
  calculatorEstimateEuros: number;
  hourlyRate: number;
  jobBenchmark: JobPriceBenchmark | null;
}): ProfitabilityMarketInsight | null {
  const { sellingPrice, costs, calculatorEstimateEuros, hourlyRate, jobBenchmark } =
    input;

  if (sellingPrice <= 0) return null;

  const profitability = computeProfitability(sellingPrice, costs, hourlyRate);
  const typicalRange = typicalBidRangeFromBenchmark(
    calculatorEstimateEuros,
    jobBenchmark,
  );

  const assessment = assessBidFairPrice({
    bidEuros: sellingPrice,
    estimateEuros: calculatorEstimateEuros,
    jobBenchmark,
  });

  if (!assessment) {
    return {
      tier: 3,
      symbols: formatPriceTierSymbols(3),
      tierLabel: PRICE_TIER_LABELS[3],
      vsTypicalPercent: null,
      typicalRange,
      advisory: buildProfitabilityAdvisory({
        tier: 3,
        profitMarginPercent: profitability.profitMarginPercent,
        profitEuros: profitability.profit,
      }),
      profitability,
    };
  }

  return {
    tier: assessment.tier,
    symbols: assessment.symbols,
    tierLabel: assessment.tierLabel,
    vsTypicalPercent: assessment.vsTypicalPercent,
    typicalRange,
    advisory: buildProfitabilityAdvisory({
      tier: assessment.tier,
      profitMarginPercent: profitability.profitMarginPercent,
      profitEuros: profitability.profit,
    }),
    profitability,
  };
}

export function buildProfitabilityAdvisory(input: {
  tier: PriceTier;
  profitMarginPercent: number;
  profitEuros: number;
}): string | null {
  const { tier, profitMarginPercent, profitEuros } = input;
  const highTier = tier >= 4;
  const lowTier = tier <= 2;
  const goodMargin = profitMarginPercent >= 20;
  const weakMargin = profitMarginPercent < 10;
  const negative = profitEuros < 0;

  if (negative) {
    return "Myyntihinta on alle arvioidut kustannukset — tarkista laskelma ennen tarjouksen lähettämistä.";
  }

  if (highTier && goodMargin) {
    return "Tällä hinnalla olet markkinassa kallis, mutta urakka on sinulle kannattava. Voit tarjota tätä hintaa tietoisesti.";
  }

  if (highTier && weakMargin) {
    return "Hintataso on korkea ja kate matala — tarkista kulut tai harkitse hinnan tarkistusta.";
  }

  if (lowTier && weakMargin) {
    return "Halpa hintataso ja matala kate — varmista ettei tarjous jää tappiolle.";
  }

  if (lowTier && goodMargin) {
    return "Kilpailukykyinen hintataso ja hyvä kate — vahva tarjous.";
  }

  if (goodMargin) {
    return "Kate on hyvä suhteessa hintaan — tarjous näyttää kannattavalta.";
  }

  return null;
}

export function parseCostField(value: string): number {
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

export function costBreakdownToFields(
  costs: BidCostBreakdown,
): Record<keyof BidCostBreakdown, string> {
  return {
    materials: costs.materials > 0 ? String(costs.materials) : "",
    labor: costs.labor > 0 ? String(costs.labor) : "",
    subcontracting: costs.subcontracting > 0 ? String(costs.subcontracting) : "",
    travelEquipment: costs.travelEquipment > 0 ? String(costs.travelEquipment) : "",
    otherDirect: costs.otherDirect > 0 ? String(costs.otherDirect) : "",
  };
}

export function fieldsToCostBreakdown(
  fields: Record<keyof BidCostBreakdown, string>,
): BidCostBreakdown {
  return {
    materials: parseCostField(fields.materials),
    labor: parseCostField(fields.labor),
    subcontracting: parseCostField(fields.subcontracting),
    travelEquipment: parseCostField(fields.travelEquipment),
    otherDirect: parseCostField(fields.otherDirect),
  };
}

/** Serialisoi kannattavuus tarjouslomakkeelle. */
export function profitabilityToFormHidden(
  summary: BidProfitabilitySummary,
  costs: BidCostBreakdown,
): Record<string, string> {
  return {
    bid_profitability_json: JSON.stringify({ costs, summary }),
  };
}

export type StoredBidProfitability = {
  costs: BidCostBreakdown;
  summary: BidProfitabilitySummary;
};

export function parseStoredProfitability(raw: unknown): StoredBidProfitability | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!o.costs || !o.summary) return null;
  return raw as StoredBidProfitability;
}
