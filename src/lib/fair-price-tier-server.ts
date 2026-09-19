import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assessBidFairPrice,
  buildContractorTierProfile,
  buildJobPriceBenchmark,
  formatPriceTierSymbols,
  PRICE_TIER_LABELS,
  type ContractorTierProfile,
  type FairPriceAssessment,
  type JobPriceBenchmark,
} from "@/lib/fair-price-tier";

export async function fetchJobPriceBenchmark(
  supabase: SupabaseClient,
  jobSlug: string | null,
): Promise<JobPriceBenchmark | null> {
  const slug = jobSlug?.trim() || "generic";

  const { data } = await supabase
    .from("calculator_bid_deviations")
    .select("deviation_percent")
    .eq("job_slug", slug)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data?.length) return null;

  const deviations = data.map((r) => Number(r.deviation_percent));
  return buildJobPriceBenchmark(slug, deviations);
}

export async function fetchContractorTierProfile(
  supabase: SupabaseClient,
  contractorId: string,
  jobSlug: string | null,
  jobBenchmark: JobPriceBenchmark | null,
): Promise<ContractorTierProfile | null> {
  const slug = jobSlug?.trim() || "generic";

  const { data } = await supabase
    .from("calculator_bid_deviations")
    .select("deviation_percent")
    .eq("contractor_id", contractorId)
    .eq("job_slug", slug)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data?.length) return null;

  const deviations = data.map((r) => Number(r.deviation_percent));
  return buildContractorTierProfile(deviations, jobBenchmark);
}

export type ProjectBidFairPrice = {
  contractorId: string;
  assessment: FairPriceAssessment;
};

/** Hae tämän projektin tarjousten hintatasoarviot (laskuripohjaiset). */
export async function fetchProjectBidFairPrices(
  supabase: SupabaseClient,
  projectId: string,
  jobBenchmark: JobPriceBenchmark | null,
): Promise<Map<string, FairPriceAssessment>> {
  const { data } = await supabase
    .from("calculator_bid_deviations")
    .select("contractor_id, estimate_cents, bid_cents, deviation_percent")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const map = new Map<string, FairPriceAssessment>();

  for (const row of data ?? []) {
    const contractorId = row.contractor_id as string;
    if (map.has(contractorId)) continue;

    const estimateEuros = (row.estimate_cents as number) / 100;
    const bidEuros = (row.bid_cents as number) / 100;

    const assessment = assessBidFairPrice({
      bidEuros,
      estimateEuros,
      jobBenchmark,
    });

    if (assessment) map.set(contractorId, assessment);
  }

  return map;
}

/** Urakoitsijan profiilihintataso asiakkaan vertailuun. */
export async function fetchContractorProfileFairPrice(
  supabase: SupabaseClient,
  contractorId: string,
  jobSlug: string | null,
  jobBenchmark: JobPriceBenchmark | null,
): Promise<FairPriceAssessment | null> {
  const profile = await fetchContractorTierProfile(
    supabase,
    contractorId,
    jobSlug,
    jobBenchmark,
  );
  if (!profile || !profile.isReliable) return null;

  return {
    tier: profile.dominantTier,
    symbols: formatPriceTierSymbols(profile.dominantTier),
    tierLabel: PRICE_TIER_LABELS[profile.dominantTier],
    deviationPercent: profile.avgDeviationPercent,
    vsTypicalPercent: null,
    scopeAdjusted: true,
    isProfileReliable: true,
    profileSampleCount: profile.sampleCount,
  };
}

/** Yhdistetty hintataso vertailuun: ensin projektikohtainen, sitten profiili. */
export async function fetchFairPriceTiersForProjectBids(
  supabase: SupabaseClient,
  projectId: string,
  jobSlug: string | null,
  contractorIds: string[],
): Promise<Record<string, FairPriceAssessment>> {
  const jobBenchmark = await fetchJobPriceBenchmark(supabase, jobSlug);
  const projectMap = await fetchProjectBidFairPrices(
    supabase,
    projectId,
    jobBenchmark,
  );

  const result: Record<string, FairPriceAssessment> = {};

  for (const [contractorId, assessment] of projectMap) {
    result[contractorId] = assessment;
  }

  for (const contractorId of contractorIds) {
    if (result[contractorId]) continue;
    const profile = await fetchContractorProfileFairPrice(
      supabase,
      contractorId,
      jobSlug,
      jobBenchmark,
    );
    if (profile) result[contractorId] = profile;
  }

  return result;
}

export async function fetchContractorFairPriceContext(
  supabase: SupabaseClient,
  contractorId: string,
  jobSlug: string | null,
): Promise<{
  jobBenchmark: JobPriceBenchmark | null;
  contractorProfile: ContractorTierProfile | null;
}> {
  const jobBenchmark = await fetchJobPriceBenchmark(supabase, jobSlug);
  const contractorProfile = await fetchContractorTierProfile(
    supabase,
    contractorId,
    jobSlug,
    jobBenchmark,
  );
  return { jobBenchmark, contractorProfile };
}
