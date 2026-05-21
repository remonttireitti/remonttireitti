import type { ClimateZone } from "@/constants/climate-zones";
import type { EquipmentSupplyScope } from "@/types/equipment-supply";
import { DEFAULT_EQUIPMENT_SUPPLY } from "@/types/equipment-supply";
import type {
  CurrentHeatingType,
  ElectricityOtherLoad,
} from "@/types/heating-energy";

export type HeatDistribution =
  | "old_radiators"
  | "renewed_radiators"
  | "underfloor"
  | "supply_air"
  | "multi_circuit";

/** Piirityypit monipiirisessä järjestelmässä (ei multi_circuit). */
export type HeatCircuitType = Exclude<HeatDistribution, "multi_circuit">;

/** Jaettu vesi-ilmalämpö- ja maalämpöpumppujen lomake. */
export type HeatingSystemDetails = {
  property_type: string;
  quality_tier: "budget" | "standard" | "premium";
  equipment_supply: EquipmentSupplyScope;
  allow_optional_equipment_offer: boolean;
  installation_scenario: "new" | "replacement" | "alongside";
  /** @deprecated Käytä current_heating_type */
  current_heating: string;
  /** @deprecated Käytä alongside_heating_type */
  alongside_heating: string;
  current_heating_type: CurrentHeatingType | null;
  current_heating_other: string;
  alongside_heating_type: CurrentHeatingType | null;
  alongside_heating_other: string;
  annual_consumption_amount: number | null;
  consumption_average_years: 1 | 2 | 3;
  electricity_other_loads: ElectricityOtherLoad[];
  /** 0–0.5: painotus kohti toteutunutta kulutusta; null = automaattinen */
  energy_blend_toward_history: number | null;
  heat_distribution: HeatDistribution[];
  /** Monipiirinen: valitut piiriet (vähintään 2) */
  multi_circuit_circuits: HeatCircuitType[];
  /** @deprecated Käytä multi_circuit_circuits */
  circuit_count: number | null;
  /** @deprecated Käytä multi_circuit_circuits */
  circuit_description: string;
  heated_area_m2: number;
  climate_zone: ClimateZone;
  build_year: number | null;
  energy_consumption_notes: string;
  household_size: number;
  budget_max_eur: number | null;
  /** Sallitaanko tarjoukset, jotka ylittävät budjetin ylärajan */
  accept_offers_over_budget: boolean;
  special_notes: string;
};

export const INITIAL_HEATING_SYSTEM_DETAILS: HeatingSystemDetails = {
  property_type: "omakotitalo",
  quality_tier: "standard",
  equipment_supply: DEFAULT_EQUIPMENT_SUPPLY,
  allow_optional_equipment_offer: false,
  installation_scenario: "new",
  current_heating: "",
  alongside_heating: "",
  current_heating_type: null,
  current_heating_other: "",
  alongside_heating_type: null,
  alongside_heating_other: "",
  annual_consumption_amount: null,
  consumption_average_years: 1,
  electricity_other_loads: [],
  energy_blend_toward_history: null,
  heat_distribution: ["old_radiators"],
  multi_circuit_circuits: [],
  circuit_count: null,
  circuit_description: "",
  heated_area_m2: 150,
  climate_zone: "2",
  build_year: null,
  energy_consumption_notes: "",
  household_size: 2,
  budget_max_eur: null,
  accept_offers_over_budget: true,
  special_notes: "",
};
