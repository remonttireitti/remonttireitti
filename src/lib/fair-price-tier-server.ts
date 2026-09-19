import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assessBidFairPrice,
  buildContractorTierProfile,
  buildJobPriceBenchmark,
  formatPriceTierSymbols,
  PRICE_TIER_LABELS,
  PRICE_TIER_PROFILE_MIN_SAMPLES,
  type ContractorTierProfile,
  type FairPriceAssessment,
  type FairPriceTierDisplay,
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

async function fetchContractorDeviationSampleCount(
  supabase: SupabaseClient,
  contractorId: string,
  jobSlug: string | null,
): Promise<number> {
  const slug = jobSlug?.trim() || "generic";
  const { count } = await supabase
    .from("calculator_bid_deviations")
    .select("id", { count: "exact", head: true })
    .eq("contractor_id", contractorId)
    .eq("job_slug", slug);

  return count ?? 0;
}

/** Yhdistetty hintataso vertailuun: projektikohtainen, profiili tai muodostumassa. */
export async function fetchFairPriceTiersForProjectBids(
  supabase: SupabaseClient,
  projectId: string,
  jobSlug: string | null,
  contractorIds: string[],
): Promise<Record<string, FairPriceTierDisplay>> {
  const jobBenchmark = await fetchJobPriceBenchmark(supabase, jobSlug);
  const projectMap = await fetchProjectBidFairPrices(
    supabase,
    projectId,
    jobBenchmark,
  );

  const result: Record<string, FairPriceTierDisplay> = {};

  for (const [contractorId, assessment] of projectMap) {
    result[contractorId] = {
      kind: "shown",
      assessment,
      source: "project",
    };
  }

  for (const contractorId of contractorIds) {
    if (result[contractorId]) continue;

    const profile = await fetchContractorProfileFairPrice(
      supabase,
      contractorId,
      jobSlug,
      jobBenchmark,
    );

    if (profile) {
      result[contractorId] = {
        kind: "shown",
        assessment: profile,
        source: "profile",
      };
      continue;
    }

    const sampleCount = await fetchContractorDeviationSampleCount(
      supabase,
      contractorId,
      jobSlug,
    );

    if (sampleCount > 0 && sampleCount < PRICE_TIER_PROFILE_MIN_SAMPLES) {
      result[contractorId] = {
        kind: "building",
        sampleCount,
        required: PRICE_TIER_PROFILE_MIN_SAMPLES,
      };
    } else {
      result[contractorId] = { kind: "none" };
    }
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
