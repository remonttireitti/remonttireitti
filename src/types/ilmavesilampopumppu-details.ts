import {
  INITIAL_HEATING_SYSTEM_DETAILS,
  type HeatDistribution,
  type HeatingSystemDetails,
} from "@/types/heating-system-details";

export type { HeatDistribution };

export type IlmavesilampopumppuDetails = HeatingSystemDetails & {
  outdoor_mounting: "ground" | "wall" | "plinth" | "balcony";
  exterior_wall_structure: string;
};

export const INITIAL_IVLP_DETAILS: IlmavesilampopumppuDetails = {
  ...INITIAL_HEATING_SYSTEM_DETAILS,
  outdoor_mounting: "ground",
  exterior_wall_structure: "puu",
};
