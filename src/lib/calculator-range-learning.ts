import type { SupabaseClient } from "@supabase/supabase-js";
import type { EstimateRange } from "@/lib/calculators/types";
import { bidTotalAmountCents } from "@/lib/bid-amounts";

export type LearnedCalculatorRange = {
  calculatorSlug: string;
  jobSlug: string;
  lowMultiplier: number;
  highMultiplier: number;
  medianDeviationPercent: number;
  sampleCount: number;
};

export const LEARNED_RANGE_MIN_SAMPLES = 5;

export async function fetchLearnedCalculatorRange(
  supabase: SupabaseClient,
  calculatorSlug: string | null,
): Promise<LearnedCalculatorRange | null> {
  const slug = calculatorSlug?.trim();
  if (!slug) return null;

  const { data } = await supabase
    .from("calculator_learned_ranges")
    .select(
      "calculator_slug, job_slug, low_multiplier, high_multiplier, median_deviation_percent, sample_count",
    )
    .eq("calculator_slug", slug)
    .maybeSingle();

  if (!data || (data.sample_count as number) < LEARNED_RANGE_MIN_SAMPLES) {
    return null;
  }

  return {
    calculatorSlug: data.calculator_slug as string,
    jobSlug: (data.job_slug as string) || "generic",
    lowMultiplier: Number(data.low_multiplier),
    highMultiplier: Number(data.high_multiplier),
    medianDeviationPercent: Number(data.median_deviation_percent),
    sampleCount: data.sample_count as number,
  };
}

export async function recordCompletedProjectCalculatorOutcome(
  supabase: SupabaseClient,
  projectId: string,
): Promise<void> {
  try {
    const { data: project } = await supabase
      .from("projects")
      .select("id, job_type_id, job_types ( slug ), details")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) return;

    const jobTypes = project.job_types as
      | { slug: string }
      | { slug: string }[]
      | null;
    const jobSlug = Array.isArray(jobTypes)
      ? (jobTypes[0]?.slug ?? "generic")
      : (jobTypes?.slug ?? "generic");

    const { data: acceptedBid } = await supabase
      .from("bids")
      .select("amount_cents, offers_equipment, equipment_amount_cents")
      .eq("project_id", projectId)
      .eq("status", "accepted")
      .maybeSingle();

    if (!acceptedBid) return;

    const finalCents = bidTotalAmountCents({
      amount_cents: acceptedBid.amount_cents as number,
      offers_equipment: acceptedBid.offers_equipment,
      equipment_amount_cents: acceptedBid.equipment_amount_cents,
    });

    if (finalCents <= 0) return;

    const { data: deviation } = await supabase
      .from("calculator_bid_deviations")
      .select("estimate_cents, calculator_slug")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!deviation?.estimate_cents) return;

    const estimateCents = deviation.estimate_cents as number;
    const calculatorSlug = (deviation.calculator_slug as string | null) ?? null;

    await supabase.rpc("record_calculator_completed_outcome", {
      p_project_id: projectId,
      p_job_slug: jobSlug,
      p_calculator_slug: calculatorSlug ?? "",
      p_estimate_cents: estimateCents,
      p_final_cents: finalCents,
      p_primary_qty: null,
    });

    if (calculatorSlug) {
      await supabase.rpc("recompute_calculator_learned_range", {
        p_calculator_slug: calculatorSlug,
        p_job_slug: jobSlug,
      });
    }
  } catch (err) {
    console.warn("[recordCompletedProjectCalculatorOutcome]", err);
  }
}

export function mergeLearnedRange(
  base: EstimateRange,
  learned: LearnedCalculatorRange | null,
): EstimateRange {
  if (!learned) return base;
  return {
    lowMultiplier: learned.lowMultiplier,
    highMultiplier: learned.highMultiplier,
  };
}
