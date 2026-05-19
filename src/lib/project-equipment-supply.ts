import { isHeatingSystemDetails } from "@/lib/heating-system-details";
import { isIlpDetails } from "@/lib/ilmalampopumppu-details";
import type { EquipmentSupplyScope } from "@/types/equipment-supply";
import { DEFAULT_EQUIPMENT_SUPPLY } from "@/types/equipment-supply";

export type ProjectDetailsJson = {
  ilmalampopumppu?: unknown;
  ilmavesilampopumppu?: unknown;
  maalampopumppu?: unknown;
};

export function getProjectEquipmentSupply(
  details: ProjectDetailsJson | null | undefined,
): EquipmentSupplyScope {
  if (!details) return DEFAULT_EQUIPMENT_SUPPLY;

  for (const raw of [
    details.ilmalampopumppu,
    details.ilmavesilampopumppu,
    details.maalampopumppu,
  ]) {
    if (isIlpDetails(raw)) return raw.equipment_supply;
    if (isHeatingSystemDetails(raw)) return raw.equipment_supply;
  }

  return DEFAULT_EQUIPMENT_SUPPLY;
}

/** Näytä ja vaadi laitetakuuta, kun urakoitsija toimittaa laitteet. */
export function projectRequiresEquipmentWarranty(
  details: ProjectDetailsJson | null | undefined,
): boolean {
  return getProjectEquipmentSupply(details) !== "installation_only";
}
