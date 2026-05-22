import { createClient } from "@/lib/supabase/server";
import {
  emptyBidDefaults,
  parseBidDefaultsByJobType,
  resolveBidDefaultsForJobType,
  type ContractorBidDefaults,
  type ContractorBidDefaultsByJobType,
} from "@/lib/contractor-bid-defaults-shared";

export type ContractorBidDefaultsBundle = {
  legacy: ContractorBidDefaults;
  byJobType: ContractorBidDefaultsByJobType;
};

const emptyLegacy = emptyBidDefaults();

export async function fetchContractorBidDefaultsBundle(
  contractorId: string,
): Promise<ContractorBidDefaultsBundle> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contractor_profiles")
    .select(
      "default_bid_scope_terms, default_bid_contract_terms, default_bid_warranty_work, default_bid_warranty_equipment, default_bid_terms_by_job_type",
    )
    .eq("id", contractorId)
    .maybeSingle();

  if (!data) {
    return { legacy: emptyLegacy, byJobType: {} };
  }

  const legacy: ContractorBidDefaults = {
    scope_terms: data.default_bid_scope_terms ?? "",
    contract_terms: data.default_bid_contract_terms ?? "",
    warranty_work: data.default_bid_warranty_work ?? "",
    warranty_equipment: data.default_bid_warranty_equipment ?? "",
  };

  return {
    legacy,
    byJobType: parseBidDefaultsByJobType(data.default_bid_terms_by_job_type),
  };
}

/** Oletusehdot yhdelle tarjouspyynnölle (työlaji + vanhat yhteiset sarakkeet). */
export async function fetchContractorBidDefaults(
  contractorId: string,
  jobTypeSlug?: string | null,
): Promise<ContractorBidDefaults> {
  const bundle = await fetchContractorBidDefaultsBundle(contractorId);
  return resolveBidDefaultsForJobType(
    bundle.byJobType,
    bundle.legacy,
    jobTypeSlug,
  );
}
