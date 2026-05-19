import type { PumpSizingVariant } from "@/lib/heat-pump-sizing";
import { estimateAnnualEnergy } from "@/lib/heat-pump-sizing";
import type { ClimateZone } from "@/constants/climate-zones";
import type { HeatDistribution } from "@/types/heating-system-details";
import type {
  ConsumptionField,
  CurrentHeatingType,
  ElectricityOtherLoad,
} from "@/types/heating-energy";

export const CURRENT_HEATING_OPTIONS: {
  value: CurrentHeatingType;
  label: string;
}[] = [
  { value: "electricity", label: "Sähkölämmitys" },
  { value: "oil", label: "Öljylämmitys" },
  { value: "gas", label: "Kaasulämmitys" },
  { value: "wood", label: "Puulämmitys" },
  { value: "pellets", label: "Pellettilämmitys" },
  { value: "district_heating", label: "Kaukolämpö" },
  { value: "heat_pump", label: "Lämpöpumppu (vanha)" },
  { value: "other", label: "Muu" },
];

export const ELECTRICITY_OTHER_LOAD_OPTIONS: {
  value: ElectricityOtherLoad;
  label: string;
  kwhPerYear: number;
}[] = [
  { value: "sauna", label: "Sähkökiuas / sauna", kwhPerYear: 3500 },
  { value: "ev_car", label: "Sähköauto", kwhPerYear: 2800 },
  { value: "other_major", label: "Muu suuri kuluttaja", kwhPerYear: 2000 },
];

/** Peruskulutus (valaistus, kodinkoneet) ilman lämmitystä. */
const BASE_HOUSEHOLD_KWH_PER_PERSON = 900;

const THERMAL_KWH_PER_UNIT: Record<
  Exclude<CurrentHeatingType, "other" | "electricity">,
  number
> = {
  oil: 10,
  gas: 10,
  wood: 1850,
  pellets: 4.8,
  district_heating: 1,
  heat_pump: 1,
};

export function getConsumptionField(
  type: CurrentHeatingType | null,
): ConsumptionField | null {
  if (!type || type === "other") return null;
  const fields: Record<Exclude<CurrentHeatingType, "other">, ConsumptionField> =
    {
      electricity: {
        label: "Kokonaissähkönkulutus",
        unit: "kWh/vuosi",
        placeholder: "Esim. 18 000",
        step: 100,
      },
      oil: {
        label: "Öljynkulutus",
        unit: "litraa/vuosi",
        placeholder: "Esim. 2 500",
        step: 50,
      },
      gas: {
        label: "Kaasunkulutus",
        unit: "m³/vuosi",
        placeholder: "Esim. 1 800",
        step: 50,
      },
      wood: {
        label: "Puunkulutus",
        unit: "pinom³/vuosi",
        placeholder: "Esim. 12",
        step: 1,
      },
      pellets: {
        label: "Pellettikulutus",
        unit: "kg/vuosi",
        placeholder: "Esim. 4 000",
        step: 100,
      },
      district_heating: {
        label: "Kaukolämmönkulutus",
        unit: "kWh/vuosi",
        placeholder: "Esim. 20 000",
        step: 100,
      },
      heat_pump: {
        label: "Lämpöpumpun sähkönkulutus",
        unit: "kWh/vuosi",
        placeholder: "Esim. 6 500",
        step: 100,
      },
    };
  return fields[type];
}

export function formatHeatingTypeLabel(
  type: CurrentHeatingType | null,
  otherText: string,
): string {
  if (!type) return "—";
  if (type === "other") return otherText.trim() || "Muu lämmitys";
  return (
    CURRENT_HEATING_OPTIONS.find((o) => o.value === type)?.label ?? type
  );
}

function estimateOtherElectricityKwh(
  loads: ElectricityOtherLoad[],
  householdSize: number,
): number {
  const fromLoads = loads.reduce(
    (sum, id) =>
      sum +
      (ELECTRICITY_OTHER_LOAD_OPTIONS.find((o) => o.value === id)?.kwhPerYear ??
        0),
    0,
  );
  return fromLoads + Math.max(1, householdSize) * BASE_HOUSEHOLD_KWH_PER_PERSON;
}

/** Muuntaa ilmoitetun kulutuksen lämpöenergiaksi (kWh/v). */
export function historicalThermalKwh(input: {
  heatingType: CurrentHeatingType | null;
  amount: number | null;
  electricityOtherLoads: ElectricityOtherLoad[];
  householdSize: number;
}): number | null {
  const { heatingType, amount, electricityOtherLoads, householdSize } = input;
  if (!heatingType || amount === null || amount <= 0) return null;

  if (heatingType === "other") return null;

  if (heatingType === "electricity") {
    const other = estimateOtherElectricityKwh(
      electricityOtherLoads,
      householdSize,
    );
    return Math.max(0, amount - other);
  }

  if (heatingType === "heat_pump") {
    const cop = 2.6;
    return amount * cop;
  }

  const factor = THERMAL_KWH_PER_UNIT[heatingType];
  return amount * factor;
}

export type EnergyComparison = {
  historicalThermalKwh: number | null;
  modelThermalKwh: number | null;
  modelElectricKwh: number | null;
  adjustedThermalKwh: number | null;
  adjustedElectricKwh: number | null;
  /** Lämmitykseen käytetty sähkö nyt (suora/sähkö-IVLP) */
  historicalHeatingElectricityKwh: number | null;
  /** Arvioitu lämmityssähkö lämpöpumpulla */
  futureHeatingElectricityKwh: number | null;
  electricitySavingsKwh: number | null;
  electricitySavingsPercent: number | null;
  deviationRatio: number | null;
  autoBlend: number;
  effectiveBlend: number;
  cop: number;
  heatingElectricBreakdown: string | null;
  comparesElectricityBill: boolean;
};

export function computeEnergyComparison(input: {
  heatingType: CurrentHeatingType | null;
  annualConsumption: number | null;
  electricityOtherLoads: ElectricityOtherLoad[];
  householdSize: number;
  heatedAreaM2: number;
  climateZone: ClimateZone;
  buildYear: number | null;
  heatDistribution: HeatDistribution[];
  variant: PumpSizingVariant;
  blendTowardHistory: number | null;
}): EnergyComparison {
  const historical = historicalThermalKwh({
    heatingType: input.heatingType,
    amount: input.annualConsumption,
    electricityOtherLoads: input.electricityOtherLoads,
    householdSize: input.householdSize,
  });

  const model = estimateAnnualEnergy({
    heatedAreaM2: input.heatedAreaM2,
    climateZone: input.climateZone,
    buildYear: input.buildYear,
    variant: input.variant,
    heatDistribution: input.heatDistribution,
    householdSize: input.householdSize,
  });

  const modelThermal = model?.thermalKwhTypical ?? null;
  const modelElectric = model?.electricKwhTypical ?? null;
  const cop = model?.copAssumed ?? 3.3;

  const comparesElectricityBill =
    input.heatingType === "electricity" || input.heatingType === "heat_pump";

  let historicalHeatingElectricityKwh: number | null = null;
  if (input.heatingType === "electricity" && historical !== null) {
    historicalHeatingElectricityKwh = historical;
  } else if (
    input.heatingType === "heat_pump" &&
    input.annualConsumption !== null &&
    input.annualConsumption > 0
  ) {
    historicalHeatingElectricityKwh = input.annualConsumption;
  }

  let deviationRatio: number | null = null;
  let autoBlend = 0;

  if (
    historical !== null &&
    modelThermal !== null &&
    modelThermal > 0
  ) {
    deviationRatio = Math.abs(historical - modelThermal) / modelThermal;
    if (deviationRatio > 0.12) {
      autoBlend = Math.min(0.35, (deviationRatio - 0.12) * 0.55);
    }
  }

  const effectiveBlend =
    input.blendTowardHistory !== null
      ? Math.max(0, Math.min(0.5, input.blendTowardHistory))
      : autoBlend;

  let adjustedThermal: number | null = modelThermal;
  let adjustedElectric: number | null = modelElectric;

  if (
    historical !== null &&
    modelThermal !== null &&
    effectiveBlend > 0
  ) {
    adjustedThermal = Math.round(
      modelThermal * (1 - effectiveBlend) + historical * effectiveBlend,
    );
    adjustedElectric = Math.round(adjustedThermal / cop);
  }

  let heatingElectricBreakdown: string | null = null;
  if (
    input.heatingType === "electricity" &&
    input.annualConsumption !== null &&
    input.annualConsumption > 0
  ) {
    const other = estimateOtherElectricityKwh(
      input.electricityOtherLoads,
      input.householdSize,
    );
    const heating = Math.max(0, input.annualConsumption - other);
    heatingElectricBreakdown = `Kokonaissähkö ${input.annualConsumption.toLocaleString("fi-FI")} kWh/v − muu kulutus n. ${other.toLocaleString("fi-FI")} kWh/v ≈ lämmitys ja käyttövesi sähköllä n. ${heating.toLocaleString("fi-FI")} kWh/v`;
  }

  const futureHeatingElectricityKwh = adjustedElectric;
  let electricitySavingsKwh: number | null = null;
  let electricitySavingsPercent: number | null = null;

  if (
    historicalHeatingElectricityKwh !== null &&
    futureHeatingElectricityKwh !== null &&
    historicalHeatingElectricityKwh > futureHeatingElectricityKwh
  ) {
    electricitySavingsKwh =
      historicalHeatingElectricityKwh - futureHeatingElectricityKwh;
    electricitySavingsPercent = Math.round(
      (electricitySavingsKwh / historicalHeatingElectricityKwh) * 100,
    );
  }

  return {
    historicalThermalKwh: historical,
    modelThermalKwh: modelThermal,
    modelElectricKwh: modelElectric,
    adjustedThermalKwh: adjustedThermal,
    adjustedElectricKwh: adjustedElectric,
    historicalHeatingElectricityKwh,
    futureHeatingElectricityKwh,
    electricitySavingsKwh,
    electricitySavingsPercent,
    deviationRatio,
    autoBlend,
    effectiveBlend,
    cop,
    heatingElectricBreakdown,
    comparesElectricityBill,
  };
}

export function formatConsumptionSummary(input: {
  heatingType: CurrentHeatingType | null;
  amount: number | null;
  years: number;
  electricityOtherLoads: ElectricityOtherLoad[];
  comparison: EnergyComparison;
  extraNotes: string;
}): string | null {
  const field = getConsumptionField(input.heatingType);
  if (!input.heatingType || !field || input.amount === null) {
    return input.extraNotes.trim() || null;
  }

  const lines = [
    `Aiempi kulutus (${input.years} v keskiarvo): n. ${input.amount.toLocaleString("fi-FI")} ${field.unit}`,
  ];
  if (input.comparison.heatingElectricBreakdown) {
    lines.push(input.comparison.heatingElectricBreakdown);
  }
  if (input.comparison.historicalThermalKwh !== null) {
    lines.push(
      `Lämpöenergiana n. ${input.comparison.historicalThermalKwh.toLocaleString("fi-FI")} kWh/v`,
    );
  }
  if (
    input.comparison.historicalThermalKwh !== null &&
    input.comparison.modelThermalKwh !== null &&
    input.comparison.effectiveBlend > 0 &&
    input.comparison.adjustedThermalKwh !== null
  ) {
    lines.push(
      `Kulutusarvio oikaistu toteutuneeseen (${Math.round(input.comparison.effectiveBlend * 100)} % painotus): n. ${input.comparison.adjustedThermalKwh.toLocaleString("fi-FI")} kWh/v lämpö`,
    );
  }
  if (input.extraNotes.trim()) {
    lines.push(`Lisähuomio: ${input.extraNotes.trim()}`);
  }
  return lines.join("\n");
}

export function parseCurrentHeatingType(
  raw: unknown,
  legacyText?: string,
): CurrentHeatingType | null {
  const valid: CurrentHeatingType[] = [
    "electricity",
    "oil",
    "gas",
    "wood",
    "pellets",
    "district_heating",
    "heat_pump",
    "other",
  ];
  if (typeof raw === "string" && valid.includes(raw as CurrentHeatingType)) {
    return raw as CurrentHeatingType;
  }
  if (!legacyText?.trim()) return null;
  const s = legacyText.toLowerCase();
  if (s.includes("sähk") || s.includes("sahk")) return "electricity";
  if (s.includes("öljy") || s.includes("oljy")) return "oil";
  if (s.includes("kaasu")) return "gas";
  if (s.includes("puu") || s.includes("takka")) return "wood";
  if (s.includes("pellet")) return "pellets";
  if (s.includes("kauko") || s.includes("kaukol")) return "district_heating";
  if (s.includes("lämpöpumpp") || s.includes("lampopumpp"))
    return "heat_pump";
  return "other";
}

export function parseElectricityOtherLoads(
  raw: unknown,
): ElectricityOtherLoad[] {
  const valid: ElectricityOtherLoad[] = ["sauna", "ev_car", "other_major"];
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is ElectricityOtherLoad =>
    valid.includes(x as ElectricityOtherLoad),
  );
}
