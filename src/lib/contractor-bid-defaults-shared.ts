import type { BidFormFields } from "@/lib/bid-form";

export type ContractorBidDefaults = {
  scope_terms: string;
  contract_terms: string;
  warranty_work: string;
  warranty_equipment: string;
};

export function applyBidDefaultsToFields(
  fields: BidFormFields,
  defaults: ContractorBidDefaults,
): BidFormFields {
  return {
    ...fields,
    scope_terms: fields.scope_terms || defaults.scope_terms,
    contract_terms: fields.contract_terms || defaults.contract_terms,
    warranty_work: fields.warranty_work || defaults.warranty_work,
    warranty_equipment:
      fields.warranty_equipment || defaults.warranty_equipment,
  };
}
