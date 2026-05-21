import type { ClimateZone } from "@/constants/climate-zones";
import type { IlpCoolingNeed } from "@/constants/ilmalampopumppu";
import type { EquipmentSupplyScope } from "@/types/equipment-supply";
import { DEFAULT_EQUIPMENT_SUPPLY } from "@/types/equipment-supply";

export type IlpQuoteLayout = "single" | "two_independent_splits";

export type IlpMountHeight = "under_3m" | "over_3m";

/** Asennustiedot yhdelle erilliselle split-laitteelle. */
export type IlpUnitInstallation = {
  label: string;
  coverage_area_m2: number | null;
  pipe_distance_m: number | null;
  indoor_mount_height: IlpMountHeight;
  indoor_mount_height_m: number | null;
  outdoor_mount_height: IlpMountHeight;
  outdoor_mount_height_m: number | null;
};

export type IlmalampopumppuDetails = {
  installation_type: "new" | "replacement";
  usage: "cooling_only" | "heating_and_cooling";
  /** Jäähdytyksen vaativuus vaikutusalueella. */
  cooling_need: IlpCoolingNeed;
  quality_tier: "budget" | "standard" | "premium";
  equipment_supply: EquipmentSupplyScope;
  /** Kun equipment_supply === installation_only: urakoitsija voi tarjota laitetta erillisellä summalla. */
  allow_optional_equipment_offer: boolean;
  system_type: "split_1_1" | "multi_split";
  indoor_unit_count: number;
  /** Yksi järjestelmä tai kaksi erillistä split-tarjousta samassa pyynnössä. */
  quote_layout: IlpQuoteLayout;
  property_type: string;
  /** Vaikutusalue yhdelle järjestelmälle (quote_layout === single). */
  heated_area_m2: number;
  climate_zone: ClimateZone;
  build_year: number | null;
  /** Putkimatka ulko- ja sisäyksikön välillä (m), yksi järjestelmä. */
  pipe_distance_m_per_unit: number | null;
  indoor_mount_height: IlpMountHeight;
  indoor_mount_height_m: number | null;
  outdoor_mount_height: IlpMountHeight;
  outdoor_mount_height_m: number | null;
  /** Kahdelle erilliselle splitille: omat vaikutusalueet, putket ja korkeudet. */
  unit_installations: IlpUnitInstallation[];
  exterior_wall_material: string;
  outdoor_mounting: "ground" | "wall" | "plinth" | "balcony";
  outdoor_enclosure: boolean;
  outdoor_electrical_included: boolean;
  schedule: "asap" | "flexible" | "specific_date";
  installation_date: string | null;
  budget_max_eur: number | null;
  /** Sallitaanko tarjoukset, jotka ylittävät budjetin ylärajan */
  accept_offers_over_budget: boolean;
  special_notes: string;
};

export function createDefaultUnitInstallations(): IlpUnitInstallation[] {
  return [
    {
      label: "Laite 1",
      coverage_area_m2: null,
      pipe_distance_m: null,
      indoor_mount_height: "under_3m",
      indoor_mount_height_m: null,
      outdoor_mount_height: "under_3m",
      outdoor_mount_height_m: null,
    },
    {
      label: "Laite 2",
      coverage_area_m2: null,
      pipe_distance_m: null,
      indoor_mount_height: "under_3m",
      indoor_mount_height_m: null,
      outdoor_mount_height: "under_3m",
      outdoor_mount_height_m: null,
    },
  ];
}

export const INITIAL_ILP_DETAILS: IlmalampopumppuDetails = {
  installation_type: "new",
  usage: "heating_and_cooling",
  cooling_need: "normal",
  quality_tier: "standard",
  equipment_supply: DEFAULT_EQUIPMENT_SUPPLY,
  allow_optional_equipment_offer: true,
  system_type: "split_1_1",
  indoor_unit_count: 1,
  quote_layout: "single",
  property_type: "omakotitalo",
  heated_area_m2: 0,
  climate_zone: "2",
  build_year: null,
  pipe_distance_m_per_unit: null,
  indoor_mount_height: "under_3m",
  indoor_mount_height_m: null,
  outdoor_mount_height: "under_3m",
  outdoor_mount_height_m: null,
  unit_installations: createDefaultUnitInstallations(),
  exterior_wall_material: "puu",
  outdoor_mounting: "ground",
  outdoor_enclosure: false,
  outdoor_electrical_included: true,
  schedule: "flexible",
  installation_date: null,
  budget_max_eur: null,
  accept_offers_over_budget: true,
  special_notes: "",
};
