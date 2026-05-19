import {
  buildHeatingSystemDescription,
  parseHeatingSystemJson,
  validateHeatingSystemDetails,
} from "@/lib/heating-system-details";
import type { MaalampopumppuDetails } from "@/types/maalampopumppu-details";

export function parseMaalampDetailsJson(
  raw: string,
): MaalampopumppuDetails | null {
  const parsed = parseHeatingSystemJson(raw);
  if (!parsed) return null;
  if (parsed.installation_scenario === "alongside") {
    return {
      ...parsed,
      installation_scenario: "replacement",
      alongside_heating: "",
    };
  }
  return parsed;
}

export function validateMaalampDetails(
  d: MaalampopumppuDetails,
): string | null {
  if (d.installation_scenario === "alongside") {
    return "Maalämpöpumppu asennetaan uutena lämmityksenä tai korvaa vanhan — ei rinnalle.";
  }
  return validateHeatingSystemDetails(d);
}

export function buildMaalampDescription(d: MaalampopumppuDetails): string {
  return buildHeatingSystemDescription(d, "ground");
}

export function formatMaalampDetailsSummary(d: MaalampopumppuDetails): string {
  return buildMaalampDescription(d);
}

export function isMaalampDetails(
  value: unknown,
): value is MaalampopumppuDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    "installation_scenario" in value &&
    "heat_distribution" in value &&
    !("outdoor_mounting" in value)
  );
}
