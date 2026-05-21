import type { EquipmentSupplyScope } from "@/types/equipment-supply";
import { DEFAULT_EQUIPMENT_SUPPLY } from "@/types/equipment-supply";

export const EQUIPMENT_SUPPLY_LABELS: Record<EquipmentSupplyScope, string> = {
  device_and_installation: "Laite ja asennus (urakoitsija toimittaa laitteet)",
  installation_only: "Vain asennus (asiakas hankkii laitteet)",
};

export const EQUIPMENT_SUPPLY_OPTIONS: {
  value: EquipmentSupplyScope;
  label: string;
  hint: string;
}[] = [
  {
    value: "device_and_installation",
    label: "Laite ja asennus",
    hint: "Urakoitsija toimittaa laitteet ja tekee asennuksen",
  },
  {
    value: "installation_only",
    label: "Vain asennus",
    hint: "Hankin laitteet itse — tarjous koskee asennustyötä",
  },
];

export function parseEquipmentSupply(value: unknown): EquipmentSupplyScope {
  if (value === "installation_only") return "installation_only";
  if (value === "device_and_installation") return "device_and_installation";
  return DEFAULT_EQUIPMENT_SUPPLY;
}

export function formatEquipmentSupplyLine(
  scope: EquipmentSupplyScope,
  allowOptionalEquipmentOffer?: boolean,
): string {
  const base = `Tarjouksen laajuus: ${EQUIPMENT_SUPPLY_LABELS[scope]}`;
  if (scope === "installation_only" && allowOptionalEquipmentOffer) {
    return `${base}. Urakoitsija saa tarjota myös laitetta erillisellä hinnalla.`;
  }
  return base;
}

export const OPTIONAL_EQUIPMENT_OFFER_HINT =
  "Valinnainen: urakoitsijat voivat tarjota laitetta erillisellä rivillä (asennus/työ erikseen).";
