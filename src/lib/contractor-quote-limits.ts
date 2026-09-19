import type { SupabaseClient } from "@supabase/supabase-js";

/** Ilmaiset PDF-tarjoukset kuukaudessa (lasketaan ensimmäisestä PDF-latauksesta). */
export const CONTRACTOR_QUOTE_PDF_LIMIT_PER_MONTH = 10;

export type ContractorQuotePdfUsage = {
  used: number;
  limit: number;
  remaining: number;
  monthLabel: string;
};

function monthStartUtc(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function contractorQuoteMonthLabel(d = new Date()): string {
  return d.toLocaleDateString("fi-FI", { month: "long", year: "numeric" });
}

export async function fetchContractorQuotePdfUsage(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<ContractorQuotePdfUsage> {
  const start = monthStartUtc().toISOString();

  const { count, error } = await supabase
    .from("contractor_quote_pdf_exports")
    .select("id", { count: "exact", head: true })
    .eq("contractor_id", contractorId)
    .gte("exported_at", start);

  if (error) {
    console.warn("[fetchContractorQuotePdfUsage]", error.message);
  }

  const used = count ?? 0;
  const limit = CONTRACTOR_QUOTE_PDF_LIMIT_PER_MONTH;

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    monthLabel: contractorQuoteMonthLabel(),
  };
}

export function canExportContractorQuotePdf(
  usage: ContractorQuotePdfUsage,
  alreadyExported: boolean,
): boolean {
  if (alreadyExported) return true;
  return usage.remaining > 0;
}
