import type { ServiceJobSlug } from "@/constants/service-jobs";
import { isServiceJobSlug } from "@/constants/service-jobs";

export type ServiceEngagementType = "one_off" | "recurring";

export type ServiceFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "annual"
  | "as_needed";

export type ServiceSeason =
  | "year_round"
  | "summer"
  | "winter"
  | "spring_fall";

export type ServiceEngagement = {
  type: ServiceEngagementType;
  frequency?: ServiceFrequency;
  season?: ServiceSeason;
  visits_per_year_estimate?: number | null;
  notes?: string;
};

export type ServicePricingModel =
  | "per_visit"
  | "monthly"
  | "season"
  | "fixed";

export const SERVICE_ENGAGEMENT_TYPE_LABELS: Record<ServiceEngagementType, string> = {
  one_off: "Kertaluonteinen",
  recurring: "Jatkuva / toistuva palvelu",
};

export const SERVICE_FREQUENCY_LABELS: Record<ServiceFrequency, string> = {
  weekly: "Viikoittain",
  biweekly: "Kahden viikon välein",
  monthly: "Kuukausittain",
  quarterly: "Neljännesvuosittain",
  annual: "Kerran vuodessa",
  as_needed: "Tarpeen mukaan",
};

export const SERVICE_SEASON_LABELS: Record<ServiceSeason, string> = {
  year_round: "Ympäri vuoden",
  summer: "Kesäkausi (n. huhti–loka)",
  winter: "Talvikausi (n. marras–maalis)",
  spring_fall: "Kevät ja syksy",
};

export const SERVICE_PRICING_MODEL_LABELS: Record<ServicePricingModel, string> = {
  per_visit: "Hinta per käynti",
  monthly: "Hinta kuukaudessa",
  season: "Hinta kaudelle / sopimuskaudelle",
  fixed: "Kiinteä kokonaishinta",
};

export const INITIAL_SERVICE_ENGAGEMENT: ServiceEngagement = {
  type: "one_off",
  season: "year_round",
};

export function defaultServiceEngagementForJob(
  slug: string | null | undefined,
): ServiceEngagement {
  if (!slug) return { ...INITIAL_SERVICE_ENGAGEMENT };

  switch (slug) {
    case "nurmikon-leikkuu":
      return {
        type: "recurring",
        frequency: "weekly",
        season: "summer",
      };
    case "lumityo":
      return {
        type: "recurring",
        frequency: "as_needed",
        season: "winter",
      };
    case "ikkunanpesu":
      return {
        type: "recurring",
        frequency: "annual",
        season: "year_round",
      };
    case "siivous-koti":
      return {
        type: "recurring",
        frequency: "monthly",
        season: "year_round",
      };
    case "muutto":
    case "kuljetus":
    case "siivous-loppu":
    case "kattopesu":
      return { type: "one_off", season: "year_round" };
    default:
      return { ...INITIAL_SERVICE_ENGAGEMENT };
  }
}

export function defaultServicePricingModel(
  engagement: ServiceEngagement | null,
): ServicePricingModel {
  if (!engagement || engagement.type === "one_off") return "fixed";
  switch (engagement.frequency) {
    case "weekly":
    case "biweekly":
    case "monthly":
    case "quarterly":
      return "monthly";
    case "annual":
      return "fixed";
    case "as_needed":
      return "per_visit";
    default:
      return "per_visit";
  }
}

export function parseServiceEngagementJson(raw: string): ServiceEngagement | null {
  try {
    const parsed = JSON.parse(raw) as ServiceEngagement;
    if (parsed.type !== "one_off" && parsed.type !== "recurring") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isServiceEngagement(value: unknown): value is ServiceEngagement {
  if (!value || typeof value !== "object") return false;
  const v = value as ServiceEngagement;
  return v.type === "one_off" || v.type === "recurring";
}

export function serviceEngagementFromDetails(
  details: unknown,
): ServiceEngagement | null {
  if (!details || typeof details !== "object") return null;
  const se = (details as { service_engagement?: unknown }).service_engagement;
  return isServiceEngagement(se) ? se : null;
}

export function validateServiceEngagement(
  engagement: ServiceEngagement,
  jobSlug?: string | null,
): string | null {
  if (engagement.type === "recurring") {
    if (!engagement.frequency) {
      return "Valitse toistuvuus jatkuvaa palvelua varten.";
    }
    if (
      jobSlug === "muutto" ||
      jobSlug === "kuljetus" ||
      jobSlug === "siivous-loppu"
    ) {
      return "Tämä palvelu on yleensä kertaluonteinen — valitse kertaluonteinen tai vaihda palvelutyyppiä.";
    }
  }
  if (
    engagement.visits_per_year_estimate != null &&
    (engagement.visits_per_year_estimate < 1 ||
      engagement.visits_per_year_estimate > 365)
  ) {
    return "Käyntiarvion täytyy olla 1–365.";
  }
  return null;
}

export function formatServiceEngagementSummary(
  engagement: ServiceEngagement,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    {
      label: "Palvelun luonne",
      value: SERVICE_ENGAGEMENT_TYPE_LABELS[engagement.type],
    },
  ];

  if (engagement.type === "recurring") {
    if (engagement.frequency) {
      rows.push({
        label: "Toistuvuus",
        value: SERVICE_FREQUENCY_LABELS[engagement.frequency],
      });
    }
    if (engagement.season) {
      rows.push({
        label: "Kausi",
        value: SERVICE_SEASON_LABELS[engagement.season],
      });
    }
    if (engagement.visits_per_year_estimate != null) {
      rows.push({
        label: "Arvioitu käyntimäärä / vuosi",
        value: String(engagement.visits_per_year_estimate),
      });
    }
  }

  if (engagement.notes?.trim()) {
    rows.push({ label: "Lisätiedot", value: engagement.notes.trim() });
  }

  return rows;
}

const SERVICE_PRICING_SCOPE_PREFIX = "Palveluhinnoittelu:";

export function formatServicePricingScopeLine(
  model: ServicePricingModel,
  amountEuros: number,
): string {
  const formatted = amountEuros.toLocaleString("fi-FI");
  switch (model) {
    case "per_visit":
      return `${SERVICE_PRICING_SCOPE_PREFIX} ${formatted} € / käynti`;
    case "monthly":
      return `${SERVICE_PRICING_SCOPE_PREFIX} ${formatted} € / kk`;
    case "season":
      return `${SERVICE_PRICING_SCOPE_PREFIX} ${formatted} € / kausi`;
    case "fixed":
      return `${SERVICE_PRICING_SCOPE_PREFIX} ${formatted} € (kokonaishinta)`;
  }
}

export function parseServicePricingFromScopeTerms(scopeTerms: string | null): {
  model: ServicePricingModel | null;
  rest: string;
} {
  if (!scopeTerms?.trim()) return { model: null, rest: "" };
  const lines = scopeTerms.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (!first.startsWith(SERVICE_PRICING_SCOPE_PREFIX)) {
    return { model: null, rest: scopeTerms.trim() };
  }

  let model: ServicePricingModel | null = null;
  if (first.includes("/ käynti")) model = "per_visit";
  else if (first.includes("/ kk")) model = "monthly";
  else if (first.includes("/ kausi")) model = "season";
  else if (first.includes("kokonaishinta")) model = "fixed";

  const rest = lines.slice(1).join("\n").trim();
  return { model, rest };
}

export function isServicePricingModel(value: string): value is ServicePricingModel {
  return value in SERVICE_PRICING_MODEL_LABELS;
}

export function suggestedServicePricingModels(
  engagement: ServiceEngagement | null,
): ServicePricingModel[] {
  if (!engagement || engagement.type === "one_off") {
    return ["fixed", "per_visit"];
  }
  switch (engagement.frequency) {
    case "weekly":
    case "biweekly":
      return ["per_visit", "monthly", "season"];
    case "monthly":
    case "quarterly":
      return ["monthly", "per_visit", "season"];
    case "annual":
      return ["fixed", "season"];
    case "as_needed":
      return ["per_visit", "season", "monthly"];
    default:
      return ["per_visit", "monthly", "season", "fixed"];
  }
}

export function jobSupportsRecurring(slug: string | null | undefined): boolean {
  if (!isServiceJobSlug(slug)) return false;
  return slug !== "muutto" && slug !== "kuljetus" && slug !== "siivous-loppu";
}
