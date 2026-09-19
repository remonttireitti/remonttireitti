/**
 * Reilu hintataso — urakoitsijan hinta suhteessa vastaavan työn laskennalliseen
 * vertailutasoon (ei pelkkä loppusumma).
 */

export type PriceTier = 1 | 2 | 3 | 4 | 5;

/** Profiilin hintaluokka näkyy luotettavasti vasta N tarjouksen jälkeen. */
export const PRICE_TIER_PROFILE_MIN_SAMPLES = 10;
/** Työlajikohtainen vertailujakauma tarvitaan vähintään näin monta näytettä. */
export const PRICE_TIER_JOB_BENCHMARK_MIN = 5;

export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  1: "erittäin edullinen",
  2: "edullinen",
  3: "keskitaso",
  4: "kallis",
  5: "erittäin kallis",
};

export const FAIR_PRICE_DISCLAIMER =
  "Hintaluokka perustuu urakoitsijan tarjoushintoihin suhteessa vastaavan työn laskennalliseen vertailutasoon. Se ei tarkoita, että halvin tarjous olisi paras tai kallein huonoin.";

export const FAIR_PRICE_PROFILE_BUILDING_NOTE = (current: number, required: number) =>
  `Hintataso muodostuu luotettavasti ${required} vertailukelpoisen tarjouksen jälkeen (${current}/${required}).`;

export type FairPriceTierDisplay =
  | {
      kind: "shown";
      assessment: FairPriceAssessment;
      source: "project" | "profile";
    }
  | {
      kind: "building";
      sampleCount: number;
      required: number;
    }
  | { kind: "none" };

export function formatPriceTierSymbols(tier: PriceTier): string {
  return "€".repeat(tier);
}

export function deviationPercent(
  estimateEuros: number,
  bidEuros: number,
): number {
  if (estimateEuros <= 0 || bidEuros <= 0) return 0;
  return Math.round(((bidEuros - estimateEuros) / estimateEuros) * 1000) / 10;
}

/** Kiinteät rajat kun työlajidataa on vähän. */
export function deviationToTierFixed(deviationPercent: number): PriceTier {
  if (deviationPercent <= -18) return 1;
  if (deviationPercent <= -8) return 2;
  if (deviationPercent <= 8) return 3;
  if (deviationPercent <= 18) return 4;
  return 5;
}

function percentileRank(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 50;
  let below = 0;
  for (const v of sorted) {
    if (v < value) below++;
  }
  return (below / sorted.length) * 100;
}

/** Sijoita poikkeama työlajin historialliseen jakaumaan. */
export function deviationToTierPercentile(
  deviation: number,
  jobDeviations: number[],
): PriceTier {
  const sorted = [...jobDeviations].sort((a, b) => a - b);
  const pct = percentileRank(deviation, sorted);
  if (pct < 20) return 1;
  if (pct < 40) return 2;
  if (pct < 60) return 3;
  if (pct < 80) return 4;
  return 5;
}

export type JobPriceBenchmark = {
  jobSlug: string;
  sampleCount: number;
  p25: number;
  p50: number;
  p75: number;
};

export function buildJobPriceBenchmark(
  jobSlug: string,
  deviations: number[],
): JobPriceBenchmark | null {
  if (deviations.length === 0) return null;
  const sorted = [...deviations].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    jobSlug,
    sampleCount: n,
    p25: sorted[Math.floor(n * 0.25)] ?? sorted[0]!,
    p50: sorted[Math.floor(n * 0.5)] ?? sorted[0]!,
    p75: sorted[Math.floor(n * 0.75)] ?? sorted[n - 1]!,
  };
}

export type FairPriceAssessment = {
  tier: PriceTier;
  symbols: string;
  tierLabel: string;
  deviationPercent: number;
  /** Poikkeama tyypillisestä (mediaani) prosentteina. */
  vsTypicalPercent: number | null;
  scopeAdjusted: boolean;
  isProfileReliable: boolean;
  profileSampleCount: number;
};

export function assessBidFairPrice(input: {
  bidEuros: number;
  estimateEuros: number | null;
  jobBenchmark: JobPriceBenchmark | null;
  contractorProfileAvgDeviation?: number | null;
  contractorProfileSampleCount?: number;
}): FairPriceAssessment | null {
  const { bidEuros, estimateEuros, jobBenchmark } = input;
  if (!estimateEuros || estimateEuros <= 0 || bidEuros <= 0) return null;

  const dev = deviationPercent(estimateEuros, bidEuros);
  const usePercentile =
    jobBenchmark != null &&
    jobBenchmark.sampleCount >= PRICE_TIER_JOB_BENCHMARK_MIN;

  const tier = usePercentile
    ? deviationToTierPercentile(
        dev,
        // Reconstruct approximate distribution from benchmark percentiles
        interpolateBenchmarkDeviations(jobBenchmark),
      )
    : deviationToTierFixed(dev);

  const vsTypical =
    jobBenchmark != null
      ? Math.round((dev - jobBenchmark.p50) * 10) / 10
      : null;

  const profileCount = input.contractorProfileSampleCount ?? 0;

  return {
    tier,
    symbols: formatPriceTierSymbols(tier),
    tierLabel: PRICE_TIER_LABELS[tier],
    deviationPercent: dev,
    vsTypicalPercent: vsTypical,
    scopeAdjusted: true,
    isProfileReliable: profileCount >= PRICE_TIER_PROFILE_MIN_SAMPLES,
    profileSampleCount: profileCount,
  };
}

/** Luo approksimatiivinen jakauma percentiileistä vertailua varten. */
function interpolateBenchmarkDeviations(b: JobPriceBenchmark): number[] {
  const spread = Math.max(b.p75 - b.p25, 4);
  return [
    b.p25 - spread,
    b.p25,
    b.p50,
    b.p75,
    b.p75 + spread,
    ...Array.from({ length: Math.min(b.sampleCount, 20) }, (_, i) => {
      const t = i / Math.max(b.sampleCount - 1, 1);
      return b.p25 + t * (b.p75 - b.p25);
    }),
  ];
}

export type ContractorTierProfile = {
  avgDeviationPercent: number;
  sampleCount: number;
  dominantTier: PriceTier;
  highTierShare: number;
  tierRangeLabel: string;
  isReliable: boolean;
};

export function buildContractorTierProfile(
  deviations: number[],
  jobBenchmark: JobPriceBenchmark | null,
): ContractorTierProfile | null {
  if (deviations.length < 3) return null;

  const tiers = deviations.map((d) => {
    if (jobBenchmark && jobBenchmark.sampleCount >= PRICE_TIER_JOB_BENCHMARK_MIN) {
      return deviationToTierPercentile(
        d,
        interpolateBenchmarkDeviations(jobBenchmark),
      );
    }
    return deviationToTierFixed(d);
  });

  const avgDev =
    deviations.reduce((s, v) => s + v, 0) / deviations.length;
  const avgTier =
    tiers.reduce((s, t) => s + t, 0) / tiers.length;
  const dominantTier = Math.min(
    5,
    Math.max(1, Math.round(avgTier)),
  ) as PriceTier;

  const highCount = tiers.filter((t) => t >= 4).length;
  const highTierShare = highCount / tiers.length;

  const minTier = Math.min(...tiers) as PriceTier;
  const maxTier = Math.max(...tiers) as PriceTier;
  const tierRangeLabel =
    minTier === maxTier
      ? formatPriceTierSymbols(minTier)
      : `${formatPriceTierSymbols(minTier)}–${formatPriceTierSymbols(maxTier)}`;

  return {
    avgDeviationPercent: Math.round(avgDev * 10) / 10,
    sampleCount: deviations.length,
    dominantTier,
    highTierShare,
    tierRangeLabel,
    isReliable: deviations.length >= PRICE_TIER_PROFILE_MIN_SAMPLES,
  };
}

export type FairPriceNotice = {
  tier: PriceTier;
  symbols: string;
  tierLabel: string;
  deviationPercent: number;
  vsTypicalPercent: number | null;
  showScopeCheck: boolean;
  profileWarning: string | null;
};

export function buildFairPriceNotice(input: {
  assessment: FairPriceAssessment;
  contractorProfile: ContractorTierProfile | null;
}): FairPriceNotice {
  const { assessment, contractorProfile } = input;
  const absDev = Math.abs(assessment.deviationPercent);
  const showScopeCheck = absDev >= 10;

  let profileWarning: string | null = null;
  if (
    contractorProfile &&
    contractorProfile.isReliable &&
    contractorProfile.highTierShare >= 0.6 &&
    contractorProfile.dominantTier >= 4
  ) {
    profileWarning = `Huomio hinnoittelustasi: viimeisimmistä tarjouksistasi suuri osa sijoittuu hintaluokkaan ${contractorProfile.tierRangeLabel}. Jos tarjouksesi ovat jatkuvasti vertailuryhmää kalliimpia, yrityksesi näkyvä hintaluokka voi nousta.`;
  }

  return {
    tier: assessment.tier,
    symbols: assessment.symbols,
    tierLabel: assessment.tierLabel,
    deviationPercent: assessment.deviationPercent,
    vsTypicalPercent: assessment.vsTypicalPercent,
    showScopeCheck,
    profileWarning,
  };
}
