import type { HeatPumpSlug } from "@/constants/heat-pumps";
import { HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";

export type BidEvaluationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "completed"
  | "cancelled";

export type BidEvaluationCategory = "heat_pump" | "general";

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

export const BID_EVALUATION_CATEGORY_LABELS: Record<
  BidEvaluationCategory,
  string
> = {
  heat_pump: "Lämpöpumppu",
  general: "Yleinen remontti",
};

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
