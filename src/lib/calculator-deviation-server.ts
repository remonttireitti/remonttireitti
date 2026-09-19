import type { SupabaseClient } from "@supabase/supabase-js";

export type ContractorDeviationProfile = {
  avgDeviationPercent: number;
  sampleCount: number;
};

export type JobDeviationStats = {
  jobSlug: string;
  sampleCount: number;
  avgEstimateCents: number;
  avgBidCents: number;
  avgDeviationPercent: number;
  p25DeviationPercent: number;
  p75DeviationPercent: number;
};

export async function fetchContractorDeviationProfile(
  supabase: SupabaseClient,
  contractorId: string,
  jobSlug: string | null,
): Promise<ContractorDeviationProfile | null> {
  const slug = jobSlug?.trim() || "generic";

  const { data } = await supabase
    .from("calculator_bid_deviations")
    .select("deviation_percent")
    .eq("contractor_id", contractorId)
    .eq("job_slug", slug)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data || data.length < 3) return null;

  const values = data.map((r) => Number(r.deviation_percent));
  const avg =
    values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    avgDeviationPercent: Math.round(avg * 10) / 10,
    sampleCount: values.length,
  };
}

export async function recordCalculatorBidDeviationFromForm(
  supabase: SupabaseClient,
  params: {
    contractorId: string;
    projectId: string;
    jobSlug: string | null;
    calculatorSlug: string | null;
    estimateEuros: number | null;
    bidCents: number;
  },
): Promise<void> {
  if (!params.estimateEuros || params.estimateEuros <= 0) return;

  const estimateCents = Math.round(params.estimateEuros * 100);
  if (params.bidCents <= 0) return;

  try {
    await supabase.rpc("record_calculator_bid_deviation", {
      p_contractor_id: params.contractorId,
      p_project_id: params.projectId,
      p_job_slug: params.jobSlug ?? "generic",
      p_calculator_slug: params.calculatorSlug ?? "",
      p_estimate_cents: estimateCents,
      p_bid_cents: params.bidCents,
    });

    if (params.calculatorSlug) {
      await supabase.rpc("recompute_calculator_learned_range", {
        p_calculator_slug: params.calculatorSlug,
        p_job_slug: params.jobSlug ?? "generic",
      });
    }
  } catch (err) {
    console.warn("[recordCalculatorBidDeviationFromForm]", err);
  }
}

export async function fetchJobDeviationStatsAdmin(
  supabase: SupabaseClient,
): Promise<JobDeviationStats[]> {
  const { data } = await supabase
    .from("calculator_bid_deviations")
    .select("job_slug, estimate_cents, bid_cents, deviation_percent")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!data?.length) return [];

  const byJob = new Map<
    string,
    { estimates: number[]; bids: number[]; deviations: number[] }
  >();

  for (const row of data) {
    const slug = (row.job_slug as string) || "generic";
    const bucket = byJob.get(slug) ?? {
      estimates: [],
      bids: [],
      deviations: [],
    };
    bucket.estimates.push(row.estimate_cents as number);
    bucket.bids.push(row.bid_cents as number);
    bucket.deviations.push(Number(row.deviation_percent));
    byJob.set(slug, bucket);
  }

  const results: JobDeviationStats[] = [];

  for (const [jobSlug, bucket] of byJob) {
    const n = bucket.deviations.length;
    if (n === 0) continue;

    const sorted = [...bucket.deviations].sort((a, b) => a - b);
    const avgDev =
      sorted.reduce((s, v) => s + v, 0) / n;
    const p25 = sorted[Math.floor(n * 0.25)] ?? sorted[0]!;
    const p75 = sorted[Math.floor(n * 0.75)] ?? sorted[n - 1]!;

    results.push({
      jobSlug,
      sampleCount: n,
      avgEstimateCents: Math.round(
        bucket.estimates.reduce((s, v) => s + v, 0) / n,
      ),
      avgBidCents: Math.round(bucket.bids.reduce((s, v) => s + v, 0) / n),
      avgDeviationPercent: Math.round(avgDev * 10) / 10,
      p25DeviationPercent: p25,
      p75DeviationPercent: p75,
    });
  }

  return results.sort((a, b) => b.sampleCount - a.sampleCount);
}
