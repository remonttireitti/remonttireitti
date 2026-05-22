import { createClient } from "@/lib/supabase/server";
import type { ContractorBidDefaults } from "@/lib/contractor-bid-defaults-shared";

const empty: ContractorBidDefaults = {
  scope_terms: "",
  contract_terms: "",
  warranty_work: "",
  warranty_equipment: "",
};

export async function fetchContractorBidDefaults(
  contractorId: string,
): Promise<ContractorBidDefaults> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contractor_profiles")
    .select(
      "default_bid_scope_terms, default_bid_contract_terms, default_bid_warranty_work, default_bid_warranty_equipment",
    )
    .eq("id", contractorId)
    .maybeSingle();

  if (!data) return empty;

  return {
    scope_terms: data.default_bid_scope_terms ?? "",
    contract_terms: data.default_bid_contract_terms ?? "",
    warranty_work: data.default_bid_warranty_work ?? "",
    warranty_equipment: data.default_bid_warranty_equipment ?? "",
  };
}
