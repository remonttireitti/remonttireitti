/** Mitä tarjouspyyntö kattaa laitteiden osalta. */
export type EquipmentSupplyScope =
  | "device_and_installation"
  | "installation_only";

export const DEFAULT_EQUIPMENT_SUPPLY: EquipmentSupplyScope =
  "device_and_installation";
