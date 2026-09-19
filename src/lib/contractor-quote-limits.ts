import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ilmaiset uudet laskuritarjoukset kuukaudessa.
 * Kiintiö kuluu TALLENNUKSESTA (uusi rivi), ei PDF-viennistä.
 * Poisto ei palauta kiintiötä (ledger: contractor_quote_creation_events).
 */
export const CONTRACTOR_QUOTE_SAVE_LIMIT_PER_MONTH = 10;

/** @deprecated Käytä CONTRACTOR_QUOTE_SAVE_LIMIT_PER_MONTH — PDF ei enää rajoita. */
export const CONTRACTOR_QUOTE_PDF_LIMIT_PER_MONTH =
  CONTRACTOR_QUOTE_SAVE_LIMIT_PER_MONTH;

export type ContractorQuoteSaveUsage = {
  used: number;
  limit: number;
  remaining: number;
  monthLabel: string;
};

/** Alias vanhalle nimelle (dashboard / UI-siirtymä). */
export type ContractorQuotePdfUsage = ContractorQuoteSaveUsage;

function monthStartUtc(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function contractorQuoteMonthLabel(d = new Date()): string {
  return d.toLocaleDateString("fi-FI", { month: "long", year: "numeric" });
}

/** Kuukauden tallennuskiintiö ledgeristä (säilyy poiston jälkeen). */
export async function fetchContractorQuoteSaveUsage(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<ContractorQuoteSaveUsage> {
  const start = monthStartUtc().toISOString();

  const { count, error } = await supabase
    .from("contractor_quote_creation_events")
    .select("id", { count: "exact", head: true })
    .eq("contractor_id", contractorId)
    .gte("created_at", start);

  if (error) {
    console.warn("[fetchContractorQuoteSaveUsage]", error.message);
  }

  const used = count ?? 0;
  const limit = CONTRACTOR_QUOTE_SAVE_LIMIT_PER_MONTH;

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    monthLabel: contractorQuoteMonthLabel(),
  };
}

/** @deprecated Käytä fetchContractorQuoteSaveUsage. */
export async function fetchContractorQuotePdfUsage(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<ContractorQuoteSaveUsage> {
  return fetchContractorQuoteSaveUsage(supabase, contractorId);
}

export function canSaveNewContractorQuote(
  usage: ContractorQuoteSaveUsage,
): boolean {
  return usage.remaining > 0;
}

/**
 * PDF-vienti ei kuluta kiintiötä. Säilytetään API-yhteensopivuuden vuoksi:
 * tallennetun tarjouksen PDF on aina sallittu (alreadyExported tai ei).
 */
export function canExportContractorQuotePdf(
  _usage: ContractorQuoteSaveUsage,
  _alreadyExported: boolean,
): boolean {
  return true;
}

/** Informatiivinen PDF-vientilaskuri (ei kiintiö). */
export async function fetchContractorQuotePdfExportCount(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<{ used: number; monthLabel: string }> {
  const start = monthStartUtc().toISOString();

  const { count, error } = await supabase
    .from("contractor_quote_pdf_exports")
    .select("id", { count: "exact", head: true })
    .eq("contractor_id", contractorId)
    .gte("exported_at", start);

  if (error) {
    console.warn("[fetchContractorQuotePdfExportCount]", error.message);
  }

  return {
    used: count ?? 0,
    monthLabel: contractorQuoteMonthLabel(),
  };
}

export async function recordContractorQuoteCreationEvent(
  supabase: SupabaseClient,
  contractorId: string,
  quoteId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("contractor_quote_creation_events")
    .insert({
      contractor_id: contractorId,
      quote_id: quoteId,
    });

  if (error) {
    console.error("[recordContractorQuoteCreationEvent]", error.message);
    return { error: error.message };
  }
  return {};
}
