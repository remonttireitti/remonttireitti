import type { CalculatedLine } from "@/lib/calculators/math";
import type { BidCostBreakdown, BidProfitabilitySummary } from "@/lib/bid-profitability";
import type { BidScopeLine } from "@/lib/bid-scope-lines";

/** Tarjouksen elinkaaritila (suomenkieliset UI-tunnisteet alla). */
export type ContractorQuoteStatus =
  | "draft"
  | "ready"
  | "sent"
  | "ordered"
  | "rejected";

/** @deprecated Käytä ContractorQuoteStatus; pidetään synkassa tilastoja varten. */
export type ContractorQuoteOutcome = "pending" | "won" | "lost";

export type ContractorQuoteRow = {
  id: string;
  contractor_id: string;
  calculator_slug: string;
  job_slug: string | null;
  title: string;
  client_name: string | null;
  client_email: string | null;
  site_municipality: string | null;
  site_address: string | null;
  primary_qty: number | null;
  line_items: CalculatedLine[];
  scope_lines: BidScopeLine[];
  subtotal_cents: number;
  total_cents: number;
  margin_percent: number;
  cost_breakdown: BidCostBreakdown | null;
  profitability_summary: BidProfitabilitySummary | null;
  vat_included: boolean;
  notes: string | null;
  terms: string | null;
  validity_days: number;
  status: ContractorQuoteStatus;
  pdf_generated_at: string | null;
  outcome: ContractorQuoteOutcome;
  outcome_updated_at: string | null;
  remonttireitti_project_id: string | null;
  created_at: string;
  updated_at: string;
};

export const CONTRACTOR_QUOTE_STATUS_LABELS: Record<
  ContractorQuoteStatus,
  string
> = {
  draft: "Luonnos",
  ready: "Valmis lähetettäväksi",
  sent: "Lähetetty",
  ordered: "Tilattu",
  rejected: "Hylätty",
};

/** Tilauskuittauksen valinnat (lähetetylle tarjoukselle). */
export const CONTRACTOR_QUOTE_OUTCOME_LABELS: Record<
  ContractorQuoteOutcome,
  string
> = {
  pending: "Lähetetty",
  won: "Tilattu",
  lost: "Hylätty",
};

const LIFECYCLE_STATUSES = new Set<string>([
  "draft",
  "ready",
  "sent",
  "ordered",
  "rejected",
]);

/**
 * Ratkaisee näyttö-/laskentatilan myös legacy-riveille
 * (status=finalized + pdf/outcome).
 */
export function resolveContractorQuoteStatus(row: {
  status: string | null | undefined;
  pdf_generated_at?: string | null;
  outcome?: string | null;
}): ContractorQuoteStatus {
  const raw = row.status ?? "draft";
  if (LIFECYCLE_STATUSES.has(raw)) {
    return raw as ContractorQuoteStatus;
  }

  // Legacy: draft | finalized
  if (row.outcome === "won") return "ordered";
  if (row.outcome === "lost") return "rejected";
  if (row.pdf_generated_at) return "sent";
  if (raw === "finalized") return "ready";
  return "draft";
}

export function contractorQuoteStatusTone(
  status: ContractorQuoteStatus,
): "sky" | "emerald" | "stone" | "amber" {
  if (status === "ordered") return "emerald";
  if (status === "rejected") return "stone";
  if (status === "sent") return "amber";
  if (status === "ready") return "sky";
  return "stone";
}

/** Outcome ↔ status -synkka kirjoituksia varten. */
export function outcomeFromQuoteStatus(
  status: ContractorQuoteStatus,
): ContractorQuoteOutcome {
  if (status === "ordered") return "won";
  if (status === "rejected") return "lost";
  return "pending";
}

export function quoteStatusFromOutcome(
  outcome: ContractorQuoteOutcome,
): ContractorQuoteStatus {
  if (outcome === "won") return "ordered";
  if (outcome === "lost") return "rejected";
  return "sent";
}

/** Tallentaessa: älä pudota lähetettyä/päätettyä tarjousta takaisin "ready". */
export function statusAfterQuoteSave(
  current: ContractorQuoteStatus | null,
): ContractorQuoteStatus {
  if (
    current === "sent" ||
    current === "ordered" ||
    current === "rejected"
  ) {
    return current;
  }
  return "ready";
}

export type ContractorQuoteFormFields = {
  title: string;
  clientName: string;
  clientEmail: string;
  siteMunicipality: string;
  siteAddress: string;
  notes: string;
  terms: string;
  validityDays: number;
  vatIncluded: boolean;
};

export const EMPTY_QUOTE_FORM: ContractorQuoteFormFields = {
  title: "",
  clientName: "",
  clientEmail: "",
  siteMunicipality: "",
  siteAddress: "",
  notes: "",
  terms: "",
  validityDays: 30,
  vatIncluded: true,
};

export function defaultQuoteFormForConfig(
  title: string,
  options?: { terms?: string; validityDays?: number },
): ContractorQuoteFormFields {
  return {
    ...EMPTY_QUOTE_FORM,
    title,
    terms: options?.terms?.trim() ? options.terms.trim() : "",
    validityDays:
      options?.validityDays != null && Number.isFinite(options.validityDays)
        ? Math.round(options.validityDays)
        : EMPTY_QUOTE_FORM.validityDays,
  };
}

/** Kuluttajalle näytettävä ALV-kanta tarjous-PDF:ssä. */
export const CONTRACTOR_QUOTE_VAT_RATE = 25.5;

export function quoteVatBreakdown(totalEuros: number, vatIncluded: boolean) {
  const rate = CONTRACTOR_QUOTE_VAT_RATE;
  if (vatIncluded) {
    const net = totalEuros / (1 + rate / 100);
    const vat = totalEuros - net;
    return {
      netEuros: Math.round(net * 100) / 100,
      vatEuros: Math.round(vat * 100) / 100,
      grossEuros: totalEuros,
      vatRate: rate,
    };
  }
  const vat = totalEuros * (rate / 100);
  return {
    netEuros: totalEuros,
    vatEuros: Math.round(vat * 100) / 100,
    grossEuros: Math.round((totalEuros + vat) * 100) / 100,
    vatRate: rate,
  };
}

export function quotePdfFilename(title: string, quoteId: string): string {
  const safe = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9äöå]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `tarjous-${safe || "remonttireitti"}-${quoteId.slice(0, 8)}.pdf`;
}
