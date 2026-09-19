import type { CalculatedLine } from "@/lib/calculators/math";
import type { BidCostBreakdown, BidProfitabilitySummary } from "@/lib/bid-profitability";
import type { BidScopeLine } from "@/lib/bid-scope-lines";

export type ContractorQuoteStatus = "draft" | "finalized";
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
  status: ContractorQuoteStatus;
  pdf_generated_at: string | null;
  outcome: ContractorQuoteOutcome;
  outcome_updated_at: string | null;
  remonttireitti_project_id: string | null;
  created_at: string;
  updated_at: string;
};

export const CONTRACTOR_QUOTE_OUTCOME_LABELS: Record<
  ContractorQuoteOutcome,
  string
> = {
  pending: "Odottaa",
  won: "Tilattu",
  lost: "Ei tullut",
};

export type ContractorQuoteFormFields = {
  title: string;
  clientName: string;
  clientEmail: string;
  siteMunicipality: string;
  siteAddress: string;
  notes: string;
  vatIncluded: boolean;
};

export const EMPTY_QUOTE_FORM: ContractorQuoteFormFields = {
  title: "",
  clientName: "",
  clientEmail: "",
  siteMunicipality: "",
  siteAddress: "",
  notes: "",
  vatIncluded: true,
};

export function defaultQuoteFormForConfig(
  title: string,
): ContractorQuoteFormFields {
  return { ...EMPTY_QUOTE_FORM, title };
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
