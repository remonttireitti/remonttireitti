export type CurrentHeatingType =
  | "electricity"
  | "oil"
  | "gas"
  | "wood"
  | "pellets"
  | "district_heating"
  | "heat_pump"
  | "other";

export type ElectricityOtherLoad = "sauna" | "ev_car" | "other_major";

export type ConsumptionField = {
  label: string;
  unit: string;
  placeholder: string;
  step: number;
};
