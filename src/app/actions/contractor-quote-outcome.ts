"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ContractorQuoteOutcome } from "@/lib/contractor-quote-types";
import { contractorQuoteHubPath } from "@/lib/contractor-quote-paths";
import { createClient } from "@/lib/supabase/server";

export type ContractorQuoteOutcomeState = { error?: string; ok?: string };

function parseOutcome(raw: string): ContractorQuoteOutcome | null {
  if (raw === "won" || raw === "lost" || raw === "pending") return raw;
  return null;
}

export async function updateContractorQuoteOutcome(
  _prev: ContractorQuoteOutcomeState,
  formData: FormData,
): Promise<ContractorQuoteOutcomeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const quoteId = String(formData.get("quote_id") ?? "").trim();
  const outcome = parseOutcome(String(formData.get("outcome") ?? ""));
  if (!quoteId || !outcome) {
    return { error: "Puuttuva tarjous tai tila." };
  }

  const { data: quote } = await supabase
    .from("contractor_quotes")
    .select("id, pdf_generated_at")
    .eq("id", quoteId)
    .eq("contractor_id", user.id)
    .maybeSingle();

  if (!quote?.pdf_generated_at) {
    return { error: "Vain tulostettuja tarjouksia voi merkitä." };
  }

  const { error } = await supabase
    .from("contractor_quotes")
    .update({
      outcome,
      outcome_updated_at:
        outcome === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", quoteId)
    .eq("contractor_id", user.id);

  if (error) {
    return { error: "Tallennus epäonnistui." };
  }

  revalidatePath(contractorQuoteHubPath());
  return { ok: "Tila päivitetty." };
}
