import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveContractorQuoteStatus } from "@/lib/contractor-quote-types";

/** Kirjaa PDF-viennin ja merkitsee tarjouksen lähetetyksi (odottaa asiakasta). */
export async function recordContractorQuotePdfExport(
  supabase: SupabaseClient,
  quoteId: string,
  contractorId: string,
): Promise<void> {
  await supabase.from("contractor_quote_pdf_exports").insert({
    contractor_id: contractorId,
    quote_id: quoteId,
  });

  const { data: existing } = await supabase
    .from("contractor_quotes")
    .select("status, pdf_generated_at, outcome")
    .eq("id", quoteId)
    .eq("contractor_id", contractorId)
    .maybeSingle();

  if (!existing) return;

  const current = resolveContractorQuoteStatus({
    status: existing.status as string,
    pdf_generated_at: existing.pdf_generated_at as string | null,
    outcome: existing.outcome as string | null,
  });

  const patch: Record<string, string | null> = {
    pdf_generated_at: new Date().toISOString(),
  };

  // Valmis → Lähetetty. Älä muuta Tilattu / Hylätty.
  if (current === "draft" || current === "ready" || current === "sent") {
    patch.status = "sent";
    if (current !== "sent") {
      patch.outcome = "pending";
      patch.outcome_updated_at = null;
    }
  }

  await supabase
    .from("contractor_quotes")
    .update(patch)
    .eq("id", quoteId)
    .eq("contractor_id", contractorId);
}
