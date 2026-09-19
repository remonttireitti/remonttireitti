import type { CalculatorLineItem } from "./types";

/** Urakoitsijan omat laskentaparametrit — erillään kuluttajan viitehinnoista. */
export type ContractorPricingRates = {
  hourlyRate: number;
  marginPercent: number;
  wasteFee: number;
  travelPerKm: number;
  travelKm: number;
  scaffoldingFee: number;
  /** Rivin id → €/yksikkö tai kiinteä € */
  lineRates: Record<string, number>;
};

export const DEFAULT_CONTRACTOR_RATES: ContractorPricingRates = {
  hourlyRate: 58,
  marginPercent: 18,
  wasteFee: 180,
  travelPerKm: 0.7,
  travelKm: 0,
  scaffoldingFee: 650,
  lineRates: {},
};

export function parseContractorPricingRates(raw: unknown): ContractorPricingRates {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_CONTRACTOR_RATES, lineRates: {} };
  }
  const o = raw as Record<string, unknown>;
  const lineRates =
    o.lineRates && typeof o.lineRates === "object" && !Array.isArray(o.lineRates)
      ? Object.fromEntries(
          Object.entries(o.lineRates as Record<string, unknown>).map(([k, v]) => [
            k,
            Number(v) || 0,
          ]),
        )
      : {};

  return {
    hourlyRate: Number(o.hourlyRate) || DEFAULT_CONTRACTOR_RATES.hourlyRate,
    marginPercent: Number(o.marginPercent) || DEFAULT_CONTRACTOR_RATES.marginPercent,
    wasteFee: Number(o.wasteFee) || DEFAULT_CONTRACTOR_RATES.wasteFee,
    travelPerKm: Number(o.travelPerKm) || DEFAULT_CONTRACTOR_RATES.travelPerKm,
    travelKm: Number(o.travelKm) ?? 0,
    scaffoldingFee:
      Number(o.scaffoldingFee) || DEFAULT_CONTRACTOR_RATES.scaffoldingFee,
    lineRates,
  };
}

/** Yleiset urakoitsijakulut, joita ei ole kuluttajan viitelaskurissa. */
export function contractorOverheadLines(
  rates: ContractorPricingRates,
): CalculatorLineItem[] {
  const travel =
    rates.travelKm > 0
      ? Math.round(rates.travelPerKm * rates.travelKm)
      : 0;

  return [
    {
      id: "telineet",
      label: "Telineet / nostotyö",
      description: "Työmaan telineet, nostimet tai muu pääsy.",
      unit: "fixed",
      amount: rates.scaffoldingFee,
      enabled: true,
    },
    {
      id: "jate",
      label: "Jätehuolto",
      description: "Purun ja jätteen poiskuljetus.",
      unit: "fixed",
      amount: rates.wasteFee,
      enabled: true,
    },
    {
      id: "matka",
      label: "Matkakulut",
      description: "Kilometrikorvaus työmaalle.",
      unit: "fixed",
      amount: travel,
      enabled: travel > 0,
    },
  ];
}

/** Sovella urakoitsijan hinnat laskurin riveihin. */
export function applyContractorRatesToLines(
  items: CalculatorLineItem[],
  rates: ContractorPricingRates,
): CalculatorLineItem[] {
  return items.map((item) => {
    const override = rates.lineRates[item.id];
    if (override != null && override > 0) {
      return { ...item, amount: override };
    }
    return item;
  });
}

export function applyMargin(total: number, marginPercent: number): number {
  return Math.round(total * (1 + marginPercent / 100));
}
