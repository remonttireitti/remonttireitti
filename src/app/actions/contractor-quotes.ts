"use server";

import { createClient } from "@/lib/supabase/server";
import type { BidCalculatorResult } from "@/lib/bid-calculator-bridge";
import { scopeLinesFromCalculatorResult } from "@/lib/bid-calculator-bridge";
import { buildSeededScopeLines } from "@/lib/bid-scope-lines";
import {
  canSaveNewContractorQuote,
  fetchContractorQuoteSaveUsage,
  recordContractorQuoteCreationEvent,
} from "@/lib/contractor-quote-limits";
import { clampQuoteValidityDays } from "@/lib/contractor-quote-defaults";
import {
  resolveContractorQuoteStatus,
  statusAfterQuoteSave,
  type ContractorQuoteFormFields,
} from "@/lib/contractor-quote-types";
import { contractorQuoteHubPath } from "@/lib/contractor-quote-paths";
import { revalidatePath } from "next/cache";

export type ContractorQuoteActionState = {
  error?: string;
  success?: string;
  quoteId?: string;
};

export type DeleteContractorQuoteActionState = {
  error?: string;
  success?: string;
  redirectPath?: string;
};

function parseQuoteForm(formData: FormData): ContractorQuoteFormFields {
  return {
    title: String(formData.get("title") ?? "").trim(),
    clientName: String(formData.get("client_name") ?? "").trim(),
    clientEmail: String(formData.get("client_email") ?? "").trim(),
    siteMunicipality: String(formData.get("site_municipality") ?? "").trim(),
    siteAddress: String(formData.get("site_address") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    terms: String(formData.get("terms") ?? "").trim(),
    validityDays: clampQuoteValidityDays(formData.get("validity_days")),
    vatIncluded: formData.get("vat_included") === "on",
  };
}

function parseCalculatorResult(raw: string): BidCalculatorResult | null {
  try {
    return JSON.parse(raw) as BidCalculatorResult;
  } catch {
    return null;
  }
}

function revalidateQuotePaths(slug: string, quoteId?: string) {
  revalidatePath("/tarjouslaskuri");
  revalidatePath(`/tarjouslaskuri/${slug}`);
  if (quoteId) {
    revalidatePath(`/tarjouslaskuri/${slug}?tarjous=${quoteId}`);
  }
  revalidatePath("/oma-tili");
}

export async function saveContractorQuote(
  _prev: ContractorQuoteActionState,
  formData: FormData,
): Promise<ContractorQuoteActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const fields = parseQuoteForm(formData);
  if (!fields.title) {
    return { error: "Anna tarjouksen otsikko (esim. Kattoremontti – omakotitalo)." };
  }

  const resultRaw = String(formData.get("calculator_result_json") ?? "");
  const result = parseCalculatorResult(resultRaw);
  if (!result) {
    return { error: "Laskurin tiedot puuttuvat — laske tarjous uudelleen." };
  }

  const quoteId = String(formData.get("quote_id") ?? "").trim() || null;
  const calculatorSlug = String(formData.get("calculator_slug") ?? "").trim();
  const jobSlug = String(formData.get("job_slug") ?? "").trim() || null;
  const scopeLines = scopeLinesFromCalculatorResult(
    result,
    buildSeededScopeLines(jobSlug, ""),
  );

  let nextStatus: "ready" | "sent" | "ordered" | "rejected" | "draft" = "ready";
  if (quoteId) {
    const { data: existing } = await supabase
      .from("contractor_quotes")
      .select("status, pdf_generated_at, outcome")
      .eq("id", quoteId)
      .eq("contractor_id", user.id)
      .maybeSingle();
    if (!existing) return { error: "Tarjousta ei löydy." };
    nextStatus = statusAfterQuoteSave(
      resolveContractorQuoteStatus({
        status: existing.status as string,
        pdf_generated_at: existing.pdf_generated_at as string | null,
        outcome: existing.outcome as string | null,
      }),
    );
  } else {
    const usage = await fetchContractorQuoteSaveUsage(supabase, user.id);
    if (!canSaveNewContractorQuote(usage)) {
      return {
        error: `Kuukausiraja (${usage.limit} tallennettua tarjousta) on täynnä. Poisto ei vapauta kiintiötä. Suurempaan käyttöön hinnoittelu julkaistaan myöhemmin.`,
      };
    }
  }

  const row = {
    contractor_id: user.id,
    calculator_slug: calculatorSlug || result.calculatorSlug,
    job_slug: jobSlug,
    title: fields.title,
    client_name: fields.clientName || null,
    client_email: fields.clientEmail || null,
    site_municipality: fields.siteMunicipality || null,
    site_address: fields.siteAddress || null,
    primary_qty: result.primaryQty,
    line_items: result.lines,
    scope_lines: scopeLines,
    subtotal_cents: Math.round(result.subtotal * 100),
    total_cents: Math.round(result.totalWithMargin * 100),
    margin_percent: result.marginPercent,
    cost_breakdown: result.profitability?.costs ?? null,
    profitability_summary: result.profitability?.summary ?? null,
    vat_included: fields.vatIncluded,
    notes: fields.notes || null,
    terms: fields.terms || null,
    validity_days: fields.validityDays,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (quoteId) {
    const { error } = await supabase
      .from("contractor_quotes")
      .update(row)
      .eq("id", quoteId)
      .eq("contractor_id", user.id);

    if (error) return { error: "Tallennus epäonnistui." };

    const slug = calculatorSlug || result.calculatorSlug;
    revalidateQuotePaths(slug, quoteId);
    return {
      success: "Tarjous päivitetty.",
      quoteId,
    };
  }

  const { data, error } = await supabase
    .from("contractor_quotes")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) return { error: "Tallennus epäonnistui." };

  const ledger = await recordContractorQuoteCreationEvent(
    supabase,
    user.id,
    data.id,
  );
  if (ledger.error) {
    // Kiintiö pitää kirjata — peruuta rivi jos ledger epäonnistuu.
    await supabase
      .from("contractor_quotes")
      .delete()
      .eq("id", data.id)
      .eq("contractor_id", user.id);
    return { error: "Tallennus epäonnistui (kiintiökirjaus)." };
  }

  const slug = calculatorSlug || result.calculatorSlug;
  revalidateQuotePaths(slug, data.id);
  return {
    success: "Tarjous tallennettu.",
    quoteId: data.id,
  };
}

/**
 * Pysyvä poisto (hard delete). Kiintiöledgeriä ei pienennetä —
 * käyttäjä ei voi huijata tallenna→poista→tallenna -kierroksella.
 */
export async function deleteContractorQuote(
  _prev: DeleteContractorQuoteActionState,
  formData: FormData,
): Promise<DeleteContractorQuoteActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) return { error: "Puuttuva tarjous." };

  const { data: existing } = await supabase
    .from("contractor_quotes")
    .select("id, calculator_slug, title")
    .eq("id", quoteId)
    .eq("contractor_id", user.id)
    .maybeSingle();

  if (!existing) {
    return {
      error: "Tarjousta ei löytynyt tai sinulla ei ole oikeutta poistaa sitä.",
    };
  }

  const { error } = await supabase
    .from("contractor_quotes")
    .delete()
    .eq("id", quoteId)
    .eq("contractor_id", user.id);

  if (error) {
    console.error("[deleteContractorQuote]", error.code, error.message);
    return { error: "Poisto epäonnistui. Yritä uudelleen." };
  }

  const slug = String(existing.calculator_slug ?? "");
  revalidateQuotePaths(slug);
  revalidatePath(contractorQuoteHubPath());

  return {
    success: "Tarjous poistettu pysyvästi.",
    redirectPath: `${contractorQuoteHubPath()}?poistettu=1`,
  };
}

/** PDF-vienti ei enää kuluta kiintiötä; tarkistus säilyy API-yhteensopivuuteen. */
export async function checkContractorQuotePdfExport(
  quoteId: string,
): Promise<{ ok: boolean; error?: string; remaining?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Kirjaudu sisään." };

  const { data: quote } = await supabase
    .from("contractor_quotes")
    .select("id")
    .eq("id", quoteId)
    .eq("contractor_id", user.id)
    .maybeSingle();

  if (!quote) return { ok: false, error: "Tarjousta ei löydy." };

  const usage = await fetchContractorQuoteSaveUsage(supabase, user.id);
  return { ok: true, remaining: usage.remaining };
}
