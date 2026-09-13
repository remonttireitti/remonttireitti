import type { ProjectAreaSlug } from "@/constants/project-areas";
import { PROJECT_AREAS, areaForJobSlug } from "@/constants/project-areas";
import type { HeatPumpSlug } from "@/constants/heat-pumps";
import { HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import { evaluatorScopeLabel } from "@/lib/evaluator-scopes";

export type BidEvaluationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "completed"
  | "cancelled";

/** Alue slug tai vanha arvo yhteensopivuutta varten. */
export type BidEvaluationCategory = ProjectAreaSlug | "heat_pump" | "general";

export type BidEvaluationVerdict =
  | "good"
  | "fair"
  | "ask_clarification"
  | "caution";

export type BidEvaluationDimension =
  | "price"
  | "device_fit"
  | "scope_completeness"
  | "clarity"
  | "warranty"
  | "installation"
  | "overall";

export const BID_EVALUATION_DIMENSIONS: {
  id: BidEvaluationDimension;
  label: string;
  hint: string;
}[] = [
  {
    id: "price",
    label: "Hinta",
    hint: "Onko hinta normaalilla tasolla vai poikkeuksellinen?",
  },
  {
    id: "device_fit",
    label: "Laitteen sopivuus",
    hint: "Sopiiko laite ja teho ilmoittamiisi lähtötietoihin?",
  },
  {
    id: "scope_completeness",
    label: "Tarjouksen sisältö",
    hint: "Asennus, putkisto, kondenssi, sähköt, telineet, käyttöönotto?",
  },
  {
    id: "clarity",
    label: "Selkeys",
    hint: "Onko tarjous ymmärrettävä ja eritelty?",
  },
  {
    id: "warranty",
    label: "Takuu",
    hint: "Työn ja laitteen takuuehdot.",
  },
  {
    id: "installation",
    label: "Asennusratkaisu",
    hint: "Läpiviennit, sijoittelu ja tekninen toteutus.",
  },
  {
    id: "overall",
    label: "Kokonaisarvio",
    hint: "Yhteenveto — ei suositus urakoitsijasta.",
  },
];

export const BID_EVALUATION_VERDICT_LABELS: Record<
  BidEvaluationVerdict,
  { label: string; className: string }
> = {
  good: { label: "Hyvä", className: "bg-emerald-50 text-emerald-900 ring-emerald-200" },
  fair: { label: "Kohtuullinen", className: "bg-sky-50 text-sky-900 ring-sky-200" },
  ask_clarification: {
    label: "Pyydä tarkennusta",
    className: "bg-amber-50 text-amber-950 ring-amber-200",
  },
  caution: { label: "Huomioitavaa", className: "bg-red-50 text-red-900 ring-red-200" },
};

export const BID_EVALUATION_STATUS_LABELS: Record<BidEvaluationStatus, string> = {
  draft: "Luonnos",
  submitted: "Jonossa",
  in_review: "Arvioinnissa",
  completed: "Valmis",
  cancelled: "Peruttu",
};

export const BID_EVALUATION_CATEGORY_LABELS: Record<string, string> = {
  heat_pump: "Lämpöpumppu",
  general: "Yleinen remontti",
  ...Object.fromEntries(PROJECT_AREAS.map((a) => [a.slug, a.title])),
};

export function evaluationCategoryForJobSlug(
  jobSlug: string | null | undefined,
): BidEvaluationCategory {
  if (!jobSlug) return "general";
  const area = areaForJobSlug(jobSlug);
  return area?.slug ?? "general";
}

export function parseEvaluationCategory(raw: string): BidEvaluationCategory {
  const slug = raw.trim();
  if (slug === "heat_pump" || slug === "general") return slug;
  if (PROJECT_AREAS.some((a) => a.slug === slug)) {
    return slug as ProjectAreaSlug;
  }
  return "general";
}

export function formatEvaluationCategoryLabel(category: string): string {
  return BID_EVALUATION_CATEGORY_LABELS[category] ?? evaluatorScopeLabel(category);
}

export const IMPARTIALITY_NOTICE =
  "Autamme ymmärtämään tarjouksen sisältöä ja hintaa. Päätös urakoitsijasta on aina sinun — emme suosittele tiettyä tekijää.";

export function formatHeatPumpType(slug: string | null | undefined): string {
  if (!slug) return "—";
  return (
    HEAT_PUMP_MARKETING[slug as HeatPumpSlug]?.title ?? slug.replace(/_/g, " ")
  );
}

export function averageScore(scores: (number | null | undefined)[]): number | null {
  const valid = scores.filter((s): s is number => s != null && s >= 1 && s <= 5);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export type BidEvaluationPricingMode = "free" | "paid_per_bid";

export type BidEvaluationSettings = {
  pricing_mode: BidEvaluationPricingMode;
  price_per_bid_cents: number | null;
};

export type EvaluatorProfile = {
  evaluator_id: string;
  accepting_reviews: boolean;
  unavailable_note: string | null;
  unavailable_set_by: "self" | "admin" | null;
};

export function computeEvaluationQuoteCents(
  settings: BidEvaluationSettings,
  bidCount: number,
): number {
  if (settings.pricing_mode === "free" || bidCount < 1) return 0;
  const perBid = settings.price_per_bid_cents ?? 0;
  return perBid * bidCount;
}

export function formatEvaluationPriceLabel(
  settings: BidEvaluationSettings,
  bidCount = 1,
): string {
  if (settings.pricing_mode === "free") return "0 €";
  const total = computeEvaluationQuoteCents(settings, bidCount);
  const euros = Math.round(total / 100);
  if (bidCount <= 1) {
    const perBid = Math.round((settings.price_per_bid_cents ?? 0) / 100);
    return `${perBid} € / tarjous`;
  }
  return `${euros} € (${bidCount} tarjousta)`;
}

export function evaluationPricingSummary(
  settings: BidEvaluationSettings,
  bidCount = 1,
): string {
  if (settings.pricing_mode === "free") {
    return "Maksuton tarjousarvio — ei sido ostamaan mitään.";
  }
  const perBid = Math.round((settings.price_per_bid_cents ?? 0) / 100);
  if (bidCount <= 1) {
    return `Hinta ${perBid} € per arvioitava tarjous. Maksu otetaan käyttöön, jos arviointi ulkoistetaan.`;
  }
  const total = computeEvaluationQuoteCents(settings, bidCount);
  return `Arvio ${Math.round(total / 100)} € (${perBid} € × ${bidCount} tarjousta). Maksu otetaan käyttöön, jos arviointi ulkoistetaan.`;
}
