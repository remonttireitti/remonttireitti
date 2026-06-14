import type {
  ElectricalQualification,
  LviQualification,
  RefrigerantLicense,
} from "@/types/contractor";

const ELECTRICAL_VALUES = new Set<ElectricalQualification>([
  "s1",
  "s2",
  "s3",
  "none",
  "subcontract",
]);

const LVI_VALUES = new Set<LviQualification>([
  "putki_asentaja",
  "markatila_vedeneristaja",
  "viemarisaneeraaja",
  "subcontract",
  "none",
]);

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

export function parseElectricalQualification(
  formData: FormData,
): ElectricalQualification | null {
  const v = String(formData.get("electrical_qualification") ?? "");
  if (ELECTRICAL_VALUES.has(v as ElectricalQualification)) {
    return v as ElectricalQualification;
  }
  return null;
}

export function parseLviQualifications(formData: FormData): LviQualification[] {
  const raw = formData
    .getAll("lvi_qualifications")
    .map((v) => String(v))
    .filter((v) => LVI_VALUES.has(v as LviQualification)) as LviQualification[];

  if (raw.includes("none") || raw.includes("subcontract")) {
    const exclusive = raw.find((v) => v === "none" || v === "subcontract");
    return exclusive ? [exclusive] : raw;
  }

  return [...new Set(raw)];
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
    if (!parseElectricalQualification(formData)) {
      return "Valitse sähköpätevyys (S1, S2, S3 tai miten sähkö hoidetaan).";
    }
    const lvi = parseLviQualifications(formData);
    if (lvi.length === 0) {
      return "Valitse vähintään yksi LVI-pätevyys tai miten LVI-työt hoidetaan.";
    }
  }

  return null;
}
