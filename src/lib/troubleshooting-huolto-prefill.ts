import type { DeviceCategory } from "@/constants/maintenance";
import { DEVICE_CATEGORIES } from "@/constants/maintenance";
import type { DeviceMaintenanceDetails } from "@/types/device-maintenance-details";
import { INITIAL_DEVICE_MAINTENANCE } from "@/types/device-maintenance-details";
import { MAINTENANCE_SYMPTOMS } from "@/constants/maintenance";
import { HEAT_PUMP_BRAND_OPTIONS } from "@/lib/heat-pump-error-codes";

/** Lukee huolto-lomakkeen esitäytön URL-parametreista. */
export function parseHuoltoPrefillFromSearchParams(
  params: Record<string, string | undefined>,
): Partial<DeviceMaintenanceDetails> {
  const laite = params.laite?.trim();
  const oire = params.oire?.trim();
  const kuvaus = params.kuvaus?.trim();

  const deviceOk =
    laite &&
    DEVICE_CATEGORIES.some((c) => c.value === laite);

  const patch: Partial<DeviceMaintenanceDetails> = {
    request_kind: "korjaus",
  };

  if (deviceOk) {
    patch.device_category = laite as DeviceCategory;
  }

  if (oire && (MAINTENANCE_SYMPTOMS as readonly string[]).includes(oire)) {
    patch.symptoms = [oire];
  }

  if (kuvaus && kuvaus.length >= 20) {
    patch.issue_description = kuvaus;
  } else if (kuvaus) {
    patch.issue_description = `${kuvaus} `.padEnd(22, ".");
  }

  const virhekoodi = params.virhekoodi?.trim();
  const merkki = params.merkki?.trim();
  if (virhekoodi || merkki) {
    const brandLabel =
      HEAT_PUMP_BRAND_OPTIONS.find((b) => b.slug === merkki)?.label ?? merkki ?? "";
    patch.brand_model = [brandLabel, virhekoodi].filter(Boolean).join(" ").trim();
    if (virhekoodi && !patch.symptoms?.includes("Virhekoodi näytöllä")) {
      patch.symptoms = [...(patch.symptoms ?? []), "Virhekoodi näytöllä"];
    }
  }

  return patch;
}

export function mergeMaintenanceInitial(
  prefill: Partial<DeviceMaintenanceDetails>,
): DeviceMaintenanceDetails {
  return {
    ...INITIAL_DEVICE_MAINTENANCE,
    ...prefill,
    symptoms: prefill.symptoms ?? INITIAL_DEVICE_MAINTENANCE.symptoms,
  };
}
