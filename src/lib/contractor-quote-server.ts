import type { SupabaseClient } from "@supabase/supabase-js";
import {
  contractorLogoBytesForPdf,
  contractorLogoSignedUrl,
} from "@/lib/contractor-branding";
import {
  resolveContractorQuoteStatus,
  type ContractorQuoteRow,
} from "@/lib/contractor-quote-types";
import type { CalculatedLine } from "@/lib/calculators/math";
import type { BidCostBreakdown, BidProfitabilitySummary } from "@/lib/bid-profitability";
import type { BidScopeLine } from "@/lib/bid-scope-lines";

function parseQuoteRow(raw: Record<string, unknown>): ContractorQuoteRow {
  return {
    id: String(raw.id),
    contractor_id: String(raw.contractor_id),
    calculator_slug: String(raw.calculator_slug),
    job_slug: raw.job_slug != null ? String(raw.job_slug) : null,
    title: String(raw.title),
    client_name: raw.client_name != null ? String(raw.client_name) : null,
    client_email: raw.client_email != null ? String(raw.client_email) : null,
    site_municipality:
      raw.site_municipality != null ? String(raw.site_municipality) : null,
    site_address: raw.site_address != null ? String(raw.site_address) : null,
    primary_qty:
      raw.primary_qty != null ? Number(raw.primary_qty) : null,
    line_items: (raw.line_items as CalculatedLine[]) ?? [],
    scope_lines: (raw.scope_lines as BidScopeLine[]) ?? [],
    subtotal_cents: Number(raw.subtotal_cents),
    total_cents: Number(raw.total_cents),
    margin_percent: Number(raw.margin_percent),
    cost_breakdown: (raw.cost_breakdown as BidCostBreakdown | null) ?? null,
    profitability_summary:
      (raw.profitability_summary as BidProfitabilitySummary | null) ?? null,
    vat_included: Boolean(raw.vat_included),
    notes: raw.notes != null ? String(raw.notes) : null,
    terms: raw.terms != null ? String(raw.terms) : null,
    validity_days:
      raw.validity_days != null && Number.isFinite(Number(raw.validity_days))
        ? Math.max(1, Math.round(Number(raw.validity_days)))
        : 30,
    status: resolveContractorQuoteStatus({
      status: raw.status != null ? String(raw.status) : "draft",
      pdf_generated_at:
        raw.pdf_generated_at != null ? String(raw.pdf_generated_at) : null,
      outcome: raw.outcome != null ? String(raw.outcome) : null,
    }),
    pdf_generated_at:
      raw.pdf_generated_at != null ? String(raw.pdf_generated_at) : null,
    outcome:
      raw.outcome === "won" || raw.outcome === "lost"
        ? raw.outcome
        : "pending",
    outcome_updated_at:
      raw.outcome_updated_at != null ? String(raw.outcome_updated_at) : null,
    remonttireitti_project_id:
      raw.remonttireitti_project_id != null
        ? String(raw.remonttireitti_project_id)
        : null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

export async function fetchContractorQuote(
  supabase: SupabaseClient,
  quoteId: string,
  contractorId: string,
): Promise<ContractorQuoteRow | null> {
  const { data } = await supabase
    .from("contractor_quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("contractor_id", contractorId)
    .maybeSingle();

  return data ? parseQuoteRow(data as Record<string, unknown>) : null;
}

export async function fetchContractorQuotes(
  supabase: SupabaseClient,
  contractorId: string,
  limit = 20,
): Promise<ContractorQuoteRow[]> {
  const { data } = await supabase
    .from("contractor_quotes")
    .select("*")
    .eq("contractor_id", contractorId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) =>
    parseQuoteRow(row as Record<string, unknown>),
  );
}

export async function loadContractorQuotePdfData(
  supabase: SupabaseClient,
  quoteId: string,
  contractorId: string,
) {
  const quote = await fetchContractorQuote(supabase, quoteId, contractorId);
  if (!quote) return null;

  const { data: profile } = await supabase
    .from("contractor_profiles")
    .select(
      "company_name, business_id, billing_address_line, billing_postal_code, billing_city, description, logo_storage_path",
    )
    .eq("id", contractorId)
    .maybeSingle();

  const billingParts = [
    profile?.billing_address_line,
    [profile?.billing_postal_code, profile?.billing_city]
      .filter(Boolean)
      .join(" "),
  ].filter(Boolean);

  const [logo, signedLogoUrl] = await Promise.all([
    contractorLogoBytesForPdf(profile?.logo_storage_path),
    contractorLogoSignedUrl(supabase, profile?.logo_storage_path),
  ]);

  // PDF tarvitsee data-URI:n; HTML-tuloste hyväksyy myös allekirjoitetun URL:n.
  const logoDataUri = logo?.dataUri ?? null;
  const logoUrl = logoDataUri ?? signedLogoUrl;

  return {
    quote,
    companyName: profile?.company_name?.trim() || "Urakoitsija",
    businessId: profile?.business_id?.trim() || null,
    billingAddress: billingParts.length > 0 ? billingParts.join(", ") : null,
    companyDescription: profile?.description?.trim() || null,
    logoUrl,
    logoDataUri,
  };
}
