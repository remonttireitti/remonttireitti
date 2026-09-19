import type { ContractorBidDefaults } from "@/lib/contractor-bid-defaults-shared";
import { CONTRACTOR_QUOTE_VALIDITY_DAYS } from "@/lib/contractor-quote-print";

export const QUOTE_VALIDITY_DAYS_MIN = 1;
export const QUOTE_VALIDITY_DAYS_MAX = 365;

/** Rajaa voimassaolopäivät sallittuun väliin. */
export function clampQuoteValidityDays(
  raw: unknown,
  fallback = CONTRACTOR_QUOTE_VALIDITY_DAYS,
): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw.trim(), 10)
        : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(
    QUOTE_VALIDITY_DAYS_MAX,
    Math.max(QUOTE_VALIDITY_DAYS_MIN, Math.round(n)),
  );
}

/** Muodostaa tulostettavan ehtotekstin yrityksen oletusehdoista. */
export function formatQuoteTermsFromBidDefaults(
  defaults: ContractorBidDefaults,
): string {
  const parts: string[] = [];
  if (defaults.contract_terms.trim()) {
    parts.push(defaults.contract_terms.trim());
  }
  if (defaults.scope_terms.trim()) {
    parts.push(`Laajuus\n${defaults.scope_terms.trim()}`);
  }
  if (defaults.warranty_work.trim()) {
    parts.push(`Työn takuu\n${defaults.warranty_work.trim()}`);
  }
  if (defaults.warranty_equipment.trim()) {
    parts.push(`Laitteen takuu\n${defaults.warranty_equipment.trim()}`);
  }
  return parts.join("\n\n");
}
