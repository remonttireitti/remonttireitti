import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_CONTRACTOR_RATES,
  parseContractorPricingRates,
  type ContractorPricingRates,
} from "@/lib/calculators/contractor-pricing";

export async function fetchContractorPricingRates(
  contractorId: string,
): Promise<ContractorPricingRates> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contractor_profiles")
    .select("calculator_pricing_rates")
    .eq("id", contractorId)
    .maybeSingle();

  if (!data?.calculator_pricing_rates) {
    return { ...DEFAULT_CONTRACTOR_RATES, lineRates: {} };
  }

  return parseContractorPricingRates(data.calculator_pricing_rates);
}
