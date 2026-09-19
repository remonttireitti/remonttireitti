import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalculatorConfig } from "./types";
import { mergeApprovedProposalsIntoConfig } from "./learning-merge";
import { fetchApprovedProposalsForJob } from "@/lib/learned-proposals";
import {
  fetchLearnedCalculatorRange,
  mergeLearnedRange,
  type LearnedCalculatorRange,
} from "@/lib/calculator-range-learning";
import { getEstimateRange } from "./resolve";

export type EnrichedCalculatorConfig = {
  config: CalculatorConfig;
  learnedRange: LearnedCalculatorRange | null;
};

export async function enrichCalculatorConfig(
  supabase: SupabaseClient,
  baseConfig: CalculatorConfig,
): Promise<EnrichedCalculatorConfig> {
  const [approvedProposals, learnedRange] = await Promise.all([
    fetchApprovedProposalsForJob(supabase, baseConfig.jobSlug),
    fetchLearnedCalculatorRange(supabase, baseConfig.slug),
  ]);

  let config = mergeApprovedProposalsIntoConfig(baseConfig, approvedProposals);

  if (learnedRange) {
    config = {
      ...config,
      estimateRange: mergeLearnedRange(
        getEstimateRange(config),
        learnedRange,
      ),
    };
  }

  return { config, learnedRange };
}
