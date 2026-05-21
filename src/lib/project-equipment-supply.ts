import { isHeatingSystemDetails } from "@/lib/heating-system-details";
import { isIlpDetails } from "@/lib/ilmalampopumppu-details";
import type { EquipmentSupplyScope } from "@/types/equipment-supply";
import { DEFAULT_EQUIPMENT_SUPPLY } from "@/types/equipment-supply";

export type ProjectDetailsJson = {
  ilmalampopumppu?: unknown;
  ilmavesilampopumppu?: unknown;
  maalampopumppu?: unknown;
};

function readSupplyFlags(raw: unknown): {
  equipment_supply: EquipmentSupplyScope;
  allow_optional_equipment_offer: boolean;
} | null {
  if (isIlpDetails(raw)) {
    return {
      equipment_supply: raw.equipment_supply,
      allow_optional_equipment_offer: raw.allow_optional_equipment_offer,
    };
  }
  if (isHeatingSystemDetails(raw)) {
    return {
      equipment_supply: raw.equipment_supply,
      allow_optional_equipment_offer: raw.allow_optional_equipment_offer,
    };
  }
  return null;
}

export function getProjectEquipmentSupply(
  details: ProjectDetailsJson | null | undefined,
): EquipmentSupplyScope {
  if (!details) return DEFAULT_EQUIPMENT_SUPPLY;

  for (const raw of [
    details.ilmalampopumppu,
    details.ilmavesilampopumppu,
    details.maalampopumppu,
  ]) {
    const flags = readSupplyFlags(raw);
    if (flags) return flags.equipment_supply;
  }

  return DEFAULT_EQUIPMENT_SUPPLY;
}

export function projectAllowsOptionalEquipmentOffer(
  details: ProjectDetailsJson | null | undefined,
): boolean {
  if (getProjectEquipmentSupply(details) !== "installation_only") {
    return false;
  }

  if (!details) return false;

  for (const raw of [
    details.ilmalampopumppu,
    details.ilmavesilampopumppu,
    details.maalampopumppu,
  ]) {
    const flags = readSupplyFlags(raw);
    if (flags) return flags.allow_optional_equipment_offer;
  }

  return false;
}

/** Laitetakuu pakollinen, kun urakoitsija toimittaa laitteet tarjouksessa. */
export function projectRequiresEquipmentWarranty(
  details: ProjectDetailsJson | null | undefined,
  offersEquipmentInBid = false,
): boolean {
  if (getProjectEquipmentSupply(details) === "device_and_installation") {
    return true;
  }
  return (
    projectAllowsOptionalEquipmentOffer(details) && offersEquipmentInBid
  );
}
