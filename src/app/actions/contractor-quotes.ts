"use server";

import { createClient } from "@/lib/supabase/server";
import type { BidCalculatorResult } from "@/lib/bid-calculator-bridge";
import { scopeLinesFromCalculatorResult } from "@/lib/bid-calculator-bridge";
import { buildSeededScopeLines } from "@/lib/bid-scope-lines";
import {
  canExportContractorQuotePdf,
  fetchContractorQuotePdfUsage,
} from "@/lib/contractor-quote-limits";
import type { ContractorQuoteFormFields } from "@/lib/contractor-quote-types";
import { revalidatePath } from "next/cache";

export type ContractorQuoteActionState = {
  error?: string;
  success?: string;
  quoteId?: string;
};

function parseQuoteForm(formData: FormData): ContractorQuoteFormFields {
  return {
    title: String(formData.get("title") ?? "").trim(),
    clientName: String(formData.get("client_name") ?? "").trim(),
    clientEmail: String(formData.get("client_email") ?? "").trim(),
    siteMunicipality: String(formData.get("site_municipality") ?? "").trim(),
    siteAddress: String(formData.get("site_address") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
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
    status: "finalized" as const,
    updated_at: new Date().toISOString(),
  };

  if (quoteId) {
    const { error } = await supabase
      .from("contractor_quotes")
      .update(row)
      .eq("id", quoteId)
      .eq("contractor_id", user.id);

    if (error) return { error: "Tallennus epäonnistui." };

    revalidatePath("/tarjouslaskuri");
    revalidatePath(`/tarjouslaskuri/${calculatorSlug || result.calculatorSlug}`);
    revalidatePath("/oma-tili");
    return {
      success: "Tarjous tallennettu.",
      quoteId,
    };
  }

  const { data, error } = await supabase
    .from("contractor_quotes")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) return { error: "Tallennus epäonnistui." };

  revalidatePath("/tarjouslaskuri");
  revalidatePath(`/tarjouslaskuri/${calculatorSlug || result.calculatorSlug}`);
  revalidatePath("/oma-tili");
  return {
    success: "Tarjous tallennettu.",
    quoteId: data.id,
  };
}

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
    .select("id, pdf_generated_at")
    .eq("id", quoteId)
    .eq("contractor_id", user.id)
    .maybeSingle();

  if (!quote) return { ok: false, error: "Tarjousta ei löydy." };

  const usage = await fetchContractorQuotePdfUsage(supabase, user.id);
  const alreadyExported = Boolean(quote.pdf_generated_at);

  if (!canExportContractorQuotePdf(usage, alreadyExported)) {
    return {
      ok: false,
      error: `Kuukausiraja (${usage.limit} PDF-tarjousta) on täynnä. Suurempaan käyttöön hinnoittelu julkaistaan myöhemmin.`,
      remaining: 0,
    };
  }

  return { ok: true, remaining: usage.remaining };
}
