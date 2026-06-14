import type {
  RefrigerantLicense,
  WorkCapability,
} from "@/types/contractor";

export function parseJobTypeIds(formData: FormData): string[] {
  return formData
    .getAll("job_type_ids")
    .map((v) => String(v))
    .filter(Boolean);
}

export function parseTradeIds(formData: FormData): string[] {
  return formData
    .getAll("trade_ids")
    .map((v) => String(v))
    .filter(Boolean);
}

export function parseRefrigerantLicense(
  formData: FormData,
): RefrigerantLicense | null {
  const v = String(formData.get("refrigerant_license") ?? "");
  if (v === "over_3kg" || v === "under_3kg" || v === "none") return v;
  return null;
}

export function parseWorkCapability(
  formData: FormData,
  field: "electrical_capability" | "lvi_capability",
): WorkCapability | null {
  const v = String(formData.get(field) ?? "");
  if (v === "qualified" || v === "not_qualified") return v;
  return null;
}

export function validateContractorQualifications(formData: FormData): string | null {
  const jobTypeIds = parseJobTypeIds(formData);
  const tradeIds = parseTradeIds(formData);

  if (jobTypeIds.length === 0 && tradeIds.length === 0) {
    return "Valitse vähintään yksi ammatti tai lämpöpumpputyyppi.";
  }

  if (jobTypeIds.length > 0) {
    if (!parseRefrigerantLicense(formData)) {
      return "Valitse kylmäainelupa lämpöpumpuille.";
    }
    if (!parseWorkCapability(formData, "electrical_capability")) {
      return "Ilmoita sähkötyöpätevyys lämpöpumpuille.";
    }
    if (!parseWorkCapability(formData, "lvi_capability")) {
      return "Ilmoita LVI-työpätevyys lämpöpumpuille.";
    }
  }

  return null;
}
