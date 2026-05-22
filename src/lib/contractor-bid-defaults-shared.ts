import {
  HEAT_PUMP_JOB_SLUGS,
  type HeatPumpSlug,
} from "@/constants/heat-pumps";
import type { BidFormFields } from "@/lib/bid-form";

export type ContractorBidDefaults = {
  scope_terms: string;
  contract_terms: string;
  warranty_work: string;
  warranty_equipment: string;
};

export type ContractorBidDefaultsByJobType = Partial<
  Record<HeatPumpSlug, ContractorBidDefaults>
>;

export const emptyBidDefaults = (): ContractorBidDefaults => ({
  scope_terms: "",
  contract_terms: "",
  warranty_work: "",
  warranty_equipment: "",
});

export function isHeatPumpSlugKey(key: string): key is HeatPumpSlug {
  return (HEAT_PUMP_JOB_SLUGS as readonly string[]).includes(key);
}

/** Normalisoi JSONB / lomakedata turvalliseksi rakenteeksi. */
export function parseBidDefaultsByJobType(
  raw: unknown,
): ContractorBidDefaultsByJobType {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: ContractorBidDefaultsByJobType = {};
  for (const slug of HEAT_PUMP_JOB_SLUGS) {
    const entry = (raw as Record<string, unknown>)[slug];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    out[slug] = {
      scope_terms: String(e.scope_terms ?? "").trim(),
      contract_terms: String(e.contract_terms ?? "").trim(),
      warranty_work: String(e.warranty_work ?? "").trim(),
      warranty_equipment: String(e.warranty_equipment ?? "").trim(),
    };
  }
  return out;
}

/** Yhdistää työlajikohtaiset oletukset ja vanhat yhteiset sarakkeet. */
export function resolveBidDefaultsForJobType(
  byJob: ContractorBidDefaultsByJobType,
  legacy: ContractorBidDefaults,
  jobTypeSlug: string | null | undefined,
): ContractorBidDefaults {
  if (jobTypeSlug && isHeatPumpSlugKey(jobTypeSlug)) {
    const specific = byJob[jobTypeSlug];
    if (specific) {
      return {
        scope_terms: specific.scope_terms || legacy.scope_terms,
        contract_terms: specific.contract_terms || legacy.contract_terms,
        warranty_work: specific.warranty_work || legacy.warranty_work,
        warranty_equipment:
          specific.warranty_equipment || legacy.warranty_equipment,
      };
    }
  }
  return legacy;
}

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
