import {
  CLIMATE_ZONE_LABELS,
  type ClimateZone,
} from "@/constants/climate-zones";
import type { IlpCoolingNeed } from "@/constants/ilmalampopumppu";
import { estimateDhwThermalKwhPerYear } from "@/lib/domestic-hot-water";
import type { HeatDistribution } from "@/types/heating-system-details";

export type PumpSizingVariant = "air" | "water" | "ground";

export type PowerEstimateRole =
  | "building_peak"
  | "air_supplement"
  | "cooling";

export type PowerEstimate = {
  kwMin: number;
  kwTypical: number;
  kwMax: number;
  wPerM2: number;
  zone: ClimateZone;
  note: string;
  /** Selitys laskennasta (näytetään pienellä). */
  breakdown: string;
  role: PowerEstimateRole;
  headline: string;
};

export type AnnualEnergyEstimate = {
  thermalKwhMin: number;
  thermalKwhTypical: number;
  thermalKwhMax: number;
  electricKwhMin: number;
  electricKwhTypical: number;
  electricKwhMax: number;
  copAssumed: number;
  zone: ClimateZone;
  note: string;
};

/** Ulkolämpötila mitoituksessa (°C), vyöhykkeittäin — Suomen käytäntö. */
const DESIGN_OUTDOOR_C: Record<ClimateZone, number> = {
  "1": -26,
  "2": -28,
  "3": -30,
  "4": -32,
};

const INDOOR_DESIGN_C = 21;

/** Lämpöhäviökerroin vyöhykkeelle suhteessa vyöhykkeeseen II (ΔT-suhde). */
function zonePowerFactor(zone: ClimateZone): number {
  const delta = INDOOR_DESIGN_C - DESIGN_OUTDOOR_C[zone];
  const ref = INDOOR_DESIGN_C - DESIGN_OUTDOOR_C["2"];
  return delta / ref;
}

const ZONE_ENERGY_FACTOR: Record<ClimateZone, number> = {
  "1": 0.9,
  "2": 1.0,
  "3": 1.1,
  "4": 1.22,
};

const COP_BY_VARIANT: Record<PumpSizingVariant, number> = {
  air: 3.0,
  water: 3.3,
  ground: 4.0,
};

/** Lämmönjaon vaikutus: vanha patteriverkosto vaatii usein suuremman huipputehon. */
function heatDistributionFactor(
  distributions: HeatDistribution[] | undefined,
): number {
  if (!distributions?.length) return 1.0;
  let factor = 1.0;
  if (distributions.includes("old_radiators")) {
    factor = Math.max(factor, 1.14);
  }
  if (distributions.includes("renewed_radiators")) {
    factor = Math.max(factor, 1.06);
  }
  if (distributions.includes("multi_circuit")) {
    factor = Math.max(factor, 1.04);
  }
  return factor;
}

/**
 * Jos rakennusvuotta ei tiedetä, vanha patteriverkosto viittaa yleensä
 * vanhempaan taloon (heikompi eristys).
 */
export function effectiveBuildYear(
  buildYear: number | null,
  heatDistribution?: HeatDistribution[],
): number | null {
  if (buildYear !== null) return buildYear;
  if (heatDistribution?.includes("old_radiators")) return 1975;
  if (heatDistribution?.includes("renewed_radiators")) return 1995;
  return null;
}

const COOLING_W_PER_M2: Record<IlpCoolingNeed, number> = {
  light: 80,
  normal: 100,
  demanding: 125,
};

const COOLING_NEED_LABEL: Record<IlpCoolingNeed, string> = {
  light: "kevyt jäähdytystarve",
  normal: "normaali jäähdytystarve",
  demanding: "vaativa jäähdytystarve",
};

/**
 * Ilmalämpöpumpun täydentävä lämpöteho vaikutusalueelle (W/m²).
 * Ei vastaa koko talon patteriverkon huipputehoa.
 */
function airSupplementWPerM2(buildYear: number | null): number {
  const year = buildYear;
  if (year === null) return 34;
  if (year >= 2012) return 22;
  if (year >= 2005) return 26;
  if (year >= 1990) return 30;
  if (year >= 1980) return 32;
  if (year >= 1970) return 36;
  if (year >= 1960) return 38;
  return 40;
}

/**
 * Huippulämmitystehon lähtökohta W/m² (lämmitettävä pinta-ala, talven suunnittelupakkanen).
 * Perustuu suomalaisiin ohjearvoihin olemassa oleville pientaloille.
 */
function baseDesignWPerM2(
  buildYear: number | null,
  variant: PumpSizingVariant,
): number {
  const year = buildYear;
  const waterLike = variant === "water" || variant === "ground";

  if (year === null) {
    return waterLike ? 72 : 62;
  }
  if (year >= 2012) return waterLike ? 32 : 38;
  if (year >= 2005) return waterLike ? 40 : 46;
  if (year >= 1990) return waterLike ? 52 : 58;
  if (year >= 1980) return waterLike ? 62 : 68;
  if (year >= 1970) return waterLike ? 72 : 78;
  if (year >= 1960) return waterLike ? 82 : 88;
  return waterLike ? 92 : 98;
}

function annualThermalKwhPerM2(
  buildYear: number | null,
  zone: ClimateZone,
  heatDistribution?: HeatDistribution[],
): number {
  const year = effectiveBuildYear(buildYear, heatDistribution);
  let base: number;
  if (year === null) {
    base = 115;
  } else if (year >= 2012) {
    base = 55;
  } else if (year >= 2005) {
    base = 75;
  } else if (year >= 1990) {
    base = 95;
  } else if (year >= 1980) {
    base = 115;
  } else if (year >= 1970) {
    base = 135;
  } else {
    base = 155;
  }
  const dist =
    heatDistribution?.includes("old_radiators") && year !== null && year < 1990
      ? 1.08
      : 1.0;
  return base * ZONE_ENERGY_FACTOR[zone] * dist;
}

function roundKw(kw: number): number {
  return Math.round(kw * 2) / 2;
}

function roundKwh(kwh: number): number {
  return Math.round(kwh / 100) * 100;
}

export type SizingInput = {
  heatedAreaM2: number;
  climateZone: ClimateZone;
  buildYear: number | null;
  variant: PumpSizingVariant;
  heatDistribution?: HeatDistribution[];
};

function estimateAirSupplementHeatingPowerKw(
  input: SizingInput,
): PowerEstimate | null {
  const { heatedAreaM2, climateZone, buildYear } = input;
  if (heatedAreaM2 < 10) return null;

  const year = effectiveBuildYear(buildYear, input.heatDistribution);
  const baseW = airSupplementWPerM2(year);
  const zoneF = zonePowerFactor(climateZone);
  const wPerM2 = baseW * zoneF;
  const kwTypical = roundKw((heatedAreaM2 * wPerM2) / 1000);
  const spread = Math.max(0.5, kwTypical * 0.15);

  const breakdown = [
    `Vaikutusalue ${heatedAreaM2} m²`,
    year ? `rakennusvuosi ${year}` : "rakennusvuosi arvioitu",
    `${CLIMATE_ZONE_LABELS[climateZone]}`,
    `täydentävä lämpö n. ${Math.round(baseW)} W/m² × vyöhyke ${zoneF.toFixed(2)}`,
  ].join(" · ");

  return {
    kwTypical,
    kwMin: roundKw(Math.max(1.5, kwTypical - spread)),
    kwMax: roundKw(kwTypical + spread),
    wPerM2: Math.round(wPerM2),
    zone: climateZone,
    breakdown,
    role: "air_supplement",
    headline: "Arvioitu lämpöteho (täydentävä)",
    note:
      "Ilmalämpöpumppu täydentää muuta lämmitystä (patterit, suora sähkö, tms.) — ei korvaa koko talon lämmitystä pakkasella. Arvio koskee ilmoitettua vaikutusalueetta.",
  };
}

export function estimateCoolingPowerKw(
  heatedAreaM2: number,
  coolingNeed: IlpCoolingNeed,
  climateZone: ClimateZone,
): PowerEstimate | null {
  if (heatedAreaM2 < 10) return null;

  const baseW = COOLING_W_PER_M2[coolingNeed];
  const zoneF = 0.92 + (zonePowerFactor(climateZone) - 1) * 0.35;
  const wPerM2 = baseW * zoneF;
  const kwTypical = roundKw((heatedAreaM2 * wPerM2) / 1000);
  const spread = Math.max(0.5, kwTypical * 0.12);

  const breakdown = [
    `Vaikutusalue ${heatedAreaM2} m²`,
    COOLING_NEED_LABEL[coolingNeed],
    `${CLIMATE_ZONE_LABELS[climateZone]}`,
    `lähtökohta n. ${baseW} W/m² × vyöhyke ${zoneF.toFixed(2)}`,
  ].join(" · ");

  return {
    kwTypical,
    kwMin: roundKw(Math.max(1.5, kwTypical - spread)),
    kwMax: roundKw(kwTypical + spread),
    wPerM2: Math.round(wPerM2),
    zone: climateZone,
    breakdown,
    role: "cooling",
    headline: "Arvioitu jäähdytysteho",
    note:
      "Jäähdytysmitoitus kesäkäyttöön vaikutusalueelle. Lopullinen koko ja sisäyksiköiden määrä urakoitsijan arvio.",
  };
}

export function estimateHeatingPowerKw(
  input: SizingInput,
): PowerEstimate | null {
  if (input.variant === "air") {
    return estimateAirSupplementHeatingPowerKw(input);
  }

  const {
    heatedAreaM2,
    climateZone,
    buildYear,
    variant,
    heatDistribution,
  } = input;
  if (heatedAreaM2 < 10) return null;

  const year = effectiveBuildYear(buildYear, heatDistribution);
  const baseW = baseDesignWPerM2(year, variant);
  const zoneF = zonePowerFactor(climateZone);
  const distF = heatDistributionFactor(heatDistribution);
  const wPerM2 = baseW * zoneF * distF;
  const kwTypical = roundKw((heatedAreaM2 * wPerM2) / 1000);
  const spreadPct = year !== null && year < 1980 ? 0.18 : 0.12;
  const spread = Math.max(1, kwTypical * spreadPct);

  const distLabel =
    heatDistribution?.includes("old_radiators")
      ? "vanha patteriverkosto"
      : heatDistribution?.length
        ? heatDistribution.join(", ")
        : "ei eritelty";

  const breakdown = [
    `Pinta-ala ${heatedAreaM2} m²`,
    year ? `rakennusvuosi ${year}` : "rakennusikä arvioitu lämmönjaosta",
    `${CLIMATE_ZONE_LABELS[climateZone]} (mitoitus ${DESIGN_OUTDOOR_C[climateZone]} °C)`,
    `lämmönjako: ${distLabel}`,
    `lähtökohta n. ${Math.round(baseW)} W/m² × vyöhyke ${zoneF.toFixed(2)} × jako ${distF.toFixed(2)}`,
  ].join(" · ");

  return {
    kwTypical,
    kwMin: roundKw(Math.max(2, kwTypical - spread)),
    kwMax: roundKw(kwTypical + spread),
    wPerM2: Math.round(wPerM2),
    zone: climateZone,
    breakdown,
    role: "building_peak",
    headline: "Tarvittava lämpöteho",
    note:
      "Huipputeho pakkasella (21 °C sisällä). Vanhoissa patteritaloissa tarvitaan usein 70–95 W/m². Lopullinen mitoitus ja patterien riittävyys urakoitsijan arvio.",
  };
}

export function estimateAnnualEnergy(
  input: SizingInput & { householdSize?: number },
): AnnualEnergyEstimate | null {
  const {
    heatedAreaM2,
    climateZone,
    buildYear,
    variant,
    heatDistribution,
    householdSize = 2,
  } = input;
  if (heatedAreaM2 < 10) return null;

  const kwhPerM2 = annualThermalKwhPerM2(
    buildYear,
    climateZone,
    heatDistribution,
  );
  const dhwKwh = estimateDhwThermalKwhPerYear(householdSize);
  const thermalTypical = roundKwh(heatedAreaM2 * kwhPerM2 + dhwKwh);
  const spread = Math.max(800, thermalTypical * 0.14);
  const thermalMin = roundKwh(thermalTypical - spread);
  const thermalMax = roundKwh(thermalTypical + spread);
  const cop = COP_BY_VARIANT[variant];

  return {
    thermalKwhTypical: thermalTypical,
    thermalKwhMin: thermalMin,
    thermalKwhMax: thermalMax,
    electricKwhTypical: roundKwh(thermalTypical / cop),
    electricKwhMin: roundKwh(thermalMin / cop),
    electricKwhMax: roundKwh(thermalMax / cop),
    copAssumed: cop,
    zone: climateZone,
    note: `Lämpöenergian arvio vyöhykkeellä ${CLIMATE_ZONE_LABELS[climateZone]}. Sähköarvio kausi-COP n. ${cop}.`,
  };
}

export function formatPowerEstimate(e: PowerEstimate): string {
  return (
    `${e.headline}: n. ${e.kwMin}–${e.kwMax} kW (tyypillisesti n. ${e.kwTypical} kW, ${e.wPerM2} W/m²). ` +
    `${e.breakdown}. ${e.note}`
  );
}

export function formatAnnualEnergyEstimate(e: AnnualEnergyEstimate): string {
  return (
    `Arvioitu lämmitysenergia: n. ${e.thermalKwhMin.toLocaleString("fi-FI")}–${e.thermalKwhMax.toLocaleString("fi-FI")} kWh/v ` +
    `(tyypillisesti n. ${e.thermalKwhTypical.toLocaleString("fi-FI")} kWh/v). ` +
    `Arvioitu sähkönkulutus lämpöpumpulla: n. ${e.electricKwhMin.toLocaleString("fi-FI")}–${e.electricKwhMax.toLocaleString("fi-FI")} kWh/v ` +
    `(tyypillisesti n. ${e.electricKwhTypical.toLocaleString("fi-FI")} kWh/v). ${e.note}`
  );
}

export function parseClimateZone(raw: unknown): ClimateZone {
  if (raw === "1" || raw === "2" || raw === "3" || raw === "4") return raw;
  return "2";
}
