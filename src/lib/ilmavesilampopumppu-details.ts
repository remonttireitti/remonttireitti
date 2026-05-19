import {
  buildHeatingSystemDescription,
  parseHeatingSystemJson,
  validateHeatingSystemDetails,
} from "@/lib/heating-system-details";
import {
  INITIAL_IVLP_DETAILS,
  type IlmavesilampopumppuDetails,
} from "@/types/ilmavesilampopumppu-details";

const OUTDOOR_LABELS = {
  ground: "Maateline",
  wall: "Seinäteline",
  plinth: "Sokkeliteline",
  balcony: "Parveketeline",
} as const;

export function parseIvlpDetailsJson(
  raw: string,
): IlmavesilampopumppuDetails | null {
  try {
    const p = JSON.parse(raw) as Partial<IlmavesilampopumppuDetails>;
    const base = parseHeatingSystemJson(raw);
    if (!base) return null;
    return {
      ...INITIAL_IVLP_DETAILS,
      ...base,
      ...p,
      outdoor_mounting:
        p.outdoor_mounting ?? INITIAL_IVLP_DETAILS.outdoor_mounting,
      exterior_wall_structure:
        p.exterior_wall_structure ?? INITIAL_IVLP_DETAILS.exterior_wall_structure,
    };
  } catch {
    return null;
  }
}

export function validateIvlpDetails(
  d: IlmavesilampopumppuDetails,
): string | null {
  const baseErr = validateHeatingSystemDetails(d);
  if (baseErr) return baseErr;
  if (!d.exterior_wall_structure.trim()) return "Valitse ulkoseinän rakenne.";
  return null;
}

export function buildIvlpDescription(d: IlmavesilampopumppuDetails): string {
  const base = buildHeatingSystemDescription(d, "water");
  return [
    base,
    `Ulkoseinän rakenne: ${d.exterior_wall_structure}`,
    `Ulkoyksikön kiinnitys: ${OUTDOOR_LABELS[d.outdoor_mounting]}`,
  ].join("\n");
}

export function formatIvlpDetailsSummary(d: IlmavesilampopumppuDetails): string {
  return buildIvlpDescription(d);
}

export function isIvlpDetails(
  value: unknown,
): value is IlmavesilampopumppuDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    "outdoor_mounting" in value &&
    "heat_distribution" in value
  );
}
