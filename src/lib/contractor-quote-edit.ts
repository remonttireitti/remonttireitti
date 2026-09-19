import type { BidCalculatorResult } from "@/lib/bid-calculator-bridge";
import type {
  ContractorQuoteFormFields,
  ContractorQuoteRow,
} from "@/lib/contractor-quote-types";
import type { CalculatorLineItem } from "@/lib/calculators/types";

export function formFieldsFromQuote(
  quote: ContractorQuoteRow,
): ContractorQuoteFormFields {
  return {
    title: quote.title,
    clientName: quote.client_name ?? "",
    clientEmail: quote.client_email ?? "",
    siteMunicipality: quote.site_municipality ?? "",
    siteAddress: quote.site_address ?? "",
    notes: quote.notes ?? "",
    terms: quote.terms ?? "",
    validityDays: quote.validity_days,
    vatIncluded: quote.vat_included,
  };
}

/** Should the quote-level terms editor start open (vs company defaults)? */
export function quoteUsesCustomTerms(
  quote: ContractorQuoteRow,
  defaultTerms: string,
): boolean {
  const quoteTerms = (quote.terms ?? "").trim();
  const defaults = defaultTerms.trim();
  if (!quoteTerms) return !defaults;
  return quoteTerms !== defaults;
}

export function bidResultFromQuote(quote: ContractorQuoteRow): BidCalculatorResult {
  return {
    subtotal: quote.subtotal_cents / 100,
    totalWithMargin: quote.total_cents / 100,
    marginPercent: quote.margin_percent,
    lines: quote.line_items ?? [],
    primaryQty: quote.primary_qty ?? 0,
    calculatorSlug: quote.calculator_slug,
    suggestedAddons: [],
    suggestedInfoNeeds: [],
    suggestForFutureRequests: false,
    profitability:
      quote.cost_breakdown && quote.profitability_summary
        ? {
            costs: quote.cost_breakdown,
            summary: quote.profitability_summary,
          }
        : undefined,
  };
}

/**
 * Restore editable calculator rows from a saved quote.
 * Amounts are treated as fixed € so the contractor can tweak prices.
 */
export function calculatorItemsFromQuote(
  quote: ContractorQuoteRow,
): CalculatorLineItem[] {
  return (quote.line_items ?? []).map((line) => ({
    id: line.id,
    label: line.label,
    description: "",
    unit: "fixed" as const,
    amount: line.amount,
    enabled: line.enabled,
    custom: true,
  }));
}
