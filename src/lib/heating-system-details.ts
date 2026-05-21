import { CLIMATE_ZONE_LABELS } from "@/constants/climate-zones";
import {
  formatBudgetOfferPreference,
  parseAcceptOffersOverBudget,
} from "@/lib/budget-preferences";
import {
  formatEquipmentSupplyLine,
  parseEquipmentSupply,
} from "@/lib/equipment-supply";
import { formatDhwPlanLines } from "@/lib/domestic-hot-water";
import {
  computeEnergyComparison,
  formatConsumptionSummary,
  formatHeatingTypeLabel,
  parseCurrentHeatingType,
  parseElectricityOtherLoads,
} from "@/lib/heating-energy";
import {
  estimateAnnualEnergy,
  estimateHeatingPowerKw,
  formatAnnualEnergyEstimate,
  formatPowerEstimate,
  parseClimateZone,
} from "@/lib/heat-pump-sizing";
import {
  INITIAL_HEATING_SYSTEM_DETAILS,
  type HeatCircuitType,
  type HeatDistribution,
  type HeatingSystemDetails,
} from "@/types/heating-system-details";
import type { PumpSizingVariant } from "@/lib/heat-pump-sizing";

export const HEATING_LABELS = {
  quality_tier: {
    budget: "Budjettikone / edullinen",
    standard: "Perus keskitaso",
    premium: "Paras suorituskyky ja tekniikka",
  },
  installation_scenario: {
    new: "Uudisasennus",
    replacement: "Korvataan vanha lämmitys",
    alongside: "Asennetaan nykyisen lämmityksen rinnalle",
  },
  heat_distribution: {
    old_radiators: "Vanha patteriverkosto",
    renewed_radiators: "Uusitut patterit",
    underfloor: "Lattialämmitys",
    supply_air: "Tuloilman lämmitys",
    multi_circuit: "Monipiirinen järjestelmä",
  },
} as const;

const VALID_DISTRIBUTION: HeatDistribution[] = [
  "old_radiators",
  "renewed_radiators",
  "underfloor",
  "supply_air",
  "multi_circuit",
];

const VALID_CIRCUIT_TYPES: HeatCircuitType[] = [
  "old_radiators",
  "renewed_radiators",
  "underfloor",
  "supply_air",
];

export const HEAT_CIRCUIT_OPTIONS: { value: HeatCircuitType; label: string }[] =
  [
    { value: "old_radiators", label: "Vanha patteriverkosto" },
    { value: "renewed_radiators", label: "Uusitut patterit" },
    { value: "underfloor", label: "Lattialämmitys" },
    { value: "supply_air", label: "Tuloilman lämmitys" },
  ];

export function isMultiCircuit(d: HeatingSystemDetails): boolean {
  return d.heat_distribution.includes("multi_circuit");
}

/** Lämmönjako mitoitukseen ja kuvaukseen. */
export function effectiveHeatDistribution(
  d: HeatingSystemDetails,
): HeatDistribution[] {
  if (isMultiCircuit(d)) {
    return ["multi_circuit", ...d.multi_circuit_circuits];
  }
  return d.heat_distribution.filter((x) => x !== "multi_circuit");
}

function parseMultiCircuitCircuits(
  p: Partial<HeatingSystemDetails>,
  heat_distribution: HeatDistribution[],
): HeatCircuitType[] {
  if (Array.isArray(p.multi_circuit_circuits)) {
    return p.multi_circuit_circuits.filter((x): x is HeatCircuitType =>
      VALID_CIRCUIT_TYPES.includes(x as HeatCircuitType),
    );
  }
  if (heat_distribution.includes("multi_circuit")) {
    return heat_distribution.filter((x): x is HeatCircuitType =>
      VALID_CIRCUIT_TYPES.includes(x as HeatCircuitType),
    );
  }
  return [];
}

export function parseHeatingSystemJson(
  raw: string,
): HeatingSystemDetails | null {
  try {
    const p = JSON.parse(raw) as Partial<HeatingSystemDetails>;
    const heat_distribution = Array.isArray(p.heat_distribution)
      ? p.heat_distribution.filter((x): x is HeatDistribution =>
          VALID_DISTRIBUTION.includes(x as HeatDistribution),
        )
      : INITIAL_HEATING_SYSTEM_DETAILS.heat_distribution;
    const current_heating_type = parseCurrentHeatingType(
      p.current_heating_type,
      p.current_heating,
    );
    const alongside_heating_type = parseCurrentHeatingType(
      p.alongside_heating_type,
      p.alongside_heating,
    );
    return {
      ...INITIAL_HEATING_SYSTEM_DETAILS,
      ...p,
      heat_distribution,
      climate_zone: parseClimateZone(p.climate_zone),
      accept_offers_over_budget: parseAcceptOffersOverBudget(p),
      equipment_supply: parseEquipmentSupply(p.equipment_supply),
      allow_optional_equipment_offer:
        parseEquipmentSupply(p.equipment_supply) === "installation_only" &&
        p.allow_optional_equipment_offer !== false,
      current_heating_type,
      current_heating_other: String(p.current_heating_other ?? "").trim(),
      alongside_heating_type,
      alongside_heating_other: String(p.alongside_heating_other ?? "").trim(),
      current_heating: current_heating_type
        ? formatHeatingTypeLabel(current_heating_type, p.current_heating_other ?? "")
        : String(p.current_heating ?? "").trim(),
      alongside_heating: alongside_heating_type
        ? formatHeatingTypeLabel(
            alongside_heating_type,
            p.alongside_heating_other ?? "",
          )
        : String(p.alongside_heating ?? "").trim(),
      annual_consumption_amount:
        typeof p.annual_consumption_amount === "number"
          ? p.annual_consumption_amount
          : null,
      consumption_average_years:
        p.consumption_average_years === 2 || p.consumption_average_years === 3
          ? p.consumption_average_years
          : 1,
      electricity_other_loads: parseElectricityOtherLoads(
        p.electricity_other_loads,
      ),
      energy_blend_toward_history:
        typeof p.energy_blend_toward_history === "number"
          ? Math.max(0, Math.min(0.5, p.energy_blend_toward_history))
          : null,
      multi_circuit_circuits: parseMultiCircuitCircuits(p, heat_distribution),
    };
  } catch {
    return null;
  }
}

export function validateHeatingSystemDetails(
  d: HeatingSystemDetails,
): string | null {
  if (d.heated_area_m2 < 10) return "Anna lämmitettävä pinta-ala (m²).";
  if (d.household_size < 1) return "Anna talouden henkilömäärä.";
  const distribution = effectiveHeatDistribution(d);
  if (distribution.length === 0) {
    return "Valitse vähintään yksi lämmönjakotapa.";
  }
  if (d.installation_scenario === "replacement" && !d.current_heating_type) {
    return "Valitse nykyinen lämmitystapa.";
  }
  if (
    d.installation_scenario === "replacement" &&
    d.current_heating_type === "other" &&
    !d.current_heating_other.trim()
  ) {
    return "Tarkenna nykyinen lämmitystapa.";
  }
  if (d.installation_scenario === "alongside" && !d.alongside_heating_type) {
    return "Valitse lämmitys, jonka rinnalle asennetaan.";
  }
  if (
    d.installation_scenario === "alongside" &&
    d.alongside_heating_type === "other" &&
    !d.alongside_heating_other.trim()
  ) {
    return "Tarkenna rinnalle asennettava lämmitys.";
  }
  if (isMultiCircuit(d) && d.multi_circuit_circuits.length < 2) {
    return "Monipiirinen: valitse vähintään kaksi piiriä.";
  }
  if (d.build_year !== null && (d.build_year < 1800 || d.build_year > 2030)) {
    return "Tarkista rakennusvuosi.";
  }
  return null;
}

function formatDistribution(d: HeatingSystemDetails): string {
  if (isMultiCircuit(d)) {
    const circuitLabels = d.multi_circuit_circuits.map(
      (k) => HEATING_LABELS.heat_distribution[k],
    );
    return `Monipiirinen: ${circuitLabels.join(" + ")}`;
  }
  const parts = effectiveHeatDistribution(d).map(
    (k) => HEATING_LABELS.heat_distribution[k],
  );
  if (parts.length > 1) return parts.join(" + ");
  return parts[0] ?? "—";
}

function sizingLines(
  d: HeatingSystemDetails,
  variant: PumpSizingVariant,
): string[] {
  const sizingInput = {
    heatedAreaM2: d.heated_area_m2,
    climateZone: d.climate_zone,
    buildYear: d.build_year,
    variant,
    heatDistribution: effectiveHeatDistribution(d),
  };
  const power = estimateHeatingPowerKw(sizingInput);
  const energy = estimateAnnualEnergy({
    ...sizingInput,
    householdSize: d.household_size,
  });
  const lines: string[] = [
    `Ilmastovyöhyke: ${CLIMATE_ZONE_LABELS[d.climate_zone]}`,
  ];
  if (power) lines.push(formatPowerEstimate(power));
  if (energy) lines.push(formatAnnualEnergyEstimate(energy));
  return lines;
}

export function buildHeatingSystemDescription(
  d: HeatingSystemDetails,
  variant: PumpSizingVariant = "water",
): string {
  const installLine =
    d.installation_scenario === "new"
      ? HEATING_LABELS.installation_scenario.new
      : d.installation_scenario === "replacement"
        ? `${HEATING_LABELS.installation_scenario.replacement}: ${formatHeatingTypeLabel(d.current_heating_type, d.current_heating_other)}`
        : `${HEATING_LABELS.installation_scenario.alongside}: ${formatHeatingTypeLabel(d.alongside_heating_type, d.alongside_heating_other)}`;

  const heatingTypeForEnergy =
    d.installation_scenario === "alongside"
      ? d.alongside_heating_type
      : d.current_heating_type;

  const comparison = computeEnergyComparison({
    heatingType: heatingTypeForEnergy,
    annualConsumption: d.annual_consumption_amount,
    electricityOtherLoads: d.electricity_other_loads,
    householdSize: d.household_size,
    heatedAreaM2: d.heated_area_m2,
    climateZone: d.climate_zone,
    buildYear: d.build_year,
    heatDistribution: effectiveHeatDistribution(d),
    variant,
    blendTowardHistory: d.energy_blend_toward_history,
  });

  const consumptionSummary = formatConsumptionSummary({
    heatingType: heatingTypeForEnergy,
    amount: d.annual_consumption_amount,
    years: d.consumption_average_years,
    electricityOtherLoads: d.electricity_other_loads,
    comparison,
    extraNotes: d.energy_consumption_notes,
  });

  const lines = [
    formatEquipmentSupplyLine(
      d.equipment_supply,
      d.allow_optional_equipment_offer,
    ),
    `Kiinteistö: ${d.property_type}`,
    `Laatutaso: ${HEATING_LABELS.quality_tier[d.quality_tier]}`,
    `Asennus: ${installLine}`,
    `Lämmönjakotapa: ${formatDistribution(d)}`,
    `Lämmitettävä pinta-ala: n. ${d.heated_area_m2} m²`,
    d.build_year ? `Rakennusvuosi: ${d.build_year}` : null,
    consumptionSummary ? `Energiankulutus:\n${consumptionSummary}` : null,
    `Taloudessa asuu: ${d.household_size} henkilöä`,
    ...formatDhwPlanLines(d.household_size, variant),
    formatBudgetOfferPreference(
      d.budget_max_eur,
      d.accept_offers_over_budget,
    ),
    d.special_notes ? `\nLisätiedot:\n${d.special_notes}` : null,
    ...sizingLines(d, variant),
  ];
  return lines.filter(Boolean).join("\n");
}

export function isHeatingSystemDetails(
  value: unknown,
): value is HeatingSystemDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    "installation_scenario" in value &&
    "heat_distribution" in value &&
    !("outdoor_mounting" in value)
  );
}
