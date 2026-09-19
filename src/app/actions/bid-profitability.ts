"use server";

import { createClient } from "@/lib/supabase/server";
import type { BidCostBreakdown, BidProfitabilitySummary } from "@/lib/bid-profitability";
import { revalidatePath } from "next/cache";

export type BidProfitabilityActionState = { error?: string; success?: string };

export async function saveBidProfitabilityPlan(
  params: {
    projectId: string;
    bidId?: string | null;
    costs: BidCostBreakdown;
    summary: BidProfitabilitySummary;
  },
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc("upsert_bid_profitability_plan", {
      p_project_id: params.projectId,
      p_contractor_id: user.id,
      p_bid_id: params.bidId ?? null,
      p_selling_price_cents: Math.round(params.summary.sellingPrice * 100),
      p_material_cents: Math.round(params.costs.materials * 100),
      p_labor_cents: Math.round(params.costs.labor * 100),
      p_subcontract_cents: Math.round(params.costs.subcontracting * 100),
      p_travel_cents: Math.round(params.costs.travelEquipment * 100),
      p_other_cents: Math.round(params.costs.otherDirect * 100),
      p_estimated_profit_cents: Math.round(params.summary.profit * 100),
      p_estimated_margin_percent: params.summary.profitMarginPercent,
      p_estimated_hours: params.summary.estimatedHours,
    });
  } catch (err) {
    console.warn("[saveBidProfitabilityPlan]", err);
  }
}

export async function reportBidProfitabilityOutcome(
  _prev: BidProfitabilityActionState,
  formData: FormData,
): Promise<BidProfitabilityActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const projectId = String(formData.get("project_id") ?? "").trim();
  const bidEuros = Number(formData.get("bid_euros"));
  const estimatedCostEuros = Number(formData.get("estimated_cost_euros"));
  const actualCostEuros = Number(formData.get("actual_cost_euros"));
  const bidCents = Math.round(bidEuros * 100);
  const estimatedCostCents = Math.round(estimatedCostEuros * 100);
  const actualCostCents = Math.round(actualCostEuros * 100);
  const notes = String(formData.get("notes") ?? "").trim();

  if (!projectId || !Number.isFinite(bidCents) || bidCents <= 0) {
    return { error: "Puuttuva kohde tai tarjoushinta." };
  }
  if (!Number.isFinite(actualCostCents) || actualCostCents < 0) {
    return { error: "Anna toteutuneet kulut." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, status, accepted_bid_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.status !== "completed") {
    return { error: "Toteumaa voi ilmoittaa vain valmiille urakalle." };
  }

  const { data: bid } = await supabase
    .from("bids")
    .select("id, contractor_id")
    .eq("project_id", projectId)
    .eq("contractor_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();

  if (!bid) {
    return { error: "Hyväksyttyä tarjousta ei löydy." };
  }

  const { error } = await supabase.rpc("record_bid_profitability_outcome", {
    p_project_id: projectId,
    p_contractor_id: user.id,
    p_bid_cents: bidCents,
    p_estimated_cost_cents: estimatedCostCents,
    p_actual_cost_cents: actualCostCents,
    p_notes: notes || null,
  });

  if (error) {
    return { error: "Tallennus epäonnistui." };
  }

  revalidatePath(`/tarjoukset/urakka/${projectId}`);
  return {
    success: "Kiitos! Toteutuneet kulut tallennettu — data auttaa parantamaan laskureita.",
  };
}
