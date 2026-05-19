export type RefrigerantLicense = "over_3kg" | "under_3kg" | "none";
export type WorkCapability = "qualified" | "not_qualified";

export type ContractorQualifications = {
  refrigerant_license: RefrigerantLicense | null;
  electrical_capability: WorkCapability | null;
  lvi_capability: WorkCapability | null;
  job_type_ids: string[];
};

export const REFRIGERANT_LICENSE_LABELS: Record<RefrigerantLicense, string> = {
  over_3kg: "Kylmäainelupa yli 3 kg",
  under_3kg: "Kylmäainelupa alle 3 kg",
  none: "Ei kylmäainelupaa",
};

export const WORK_CAPABILITY_LABELS: Record<WorkCapability, string> = {
  qualified: "Kyllä, voin tehdä",
  not_qualified: "Pätevyys ei riitä",
};
