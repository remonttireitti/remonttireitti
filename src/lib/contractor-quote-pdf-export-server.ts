import type { SupabaseClient } from "@supabase/supabase-js";

/** Kirjaa PDF-viennin ja merkitsee tarjouksen valmiiksi. */
export async function recordContractorQuotePdfExport(
  supabase: SupabaseClient,
  quoteId: string,
  contractorId: string,
): Promise<void> {
  await supabase.from("contractor_quote_pdf_exports").insert({
    contractor_id: contractorId,
    quote_id: quoteId,
  });

  await supabase
    .from("contractor_quotes")
    .update({
      pdf_generated_at: new Date().toISOString(),
      status: "finalized",
    })
    .eq("id", quoteId)
    .eq("contractor_id", contractorId);
}
