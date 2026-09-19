/** Laskurin tulos, joka kulkee tarjouspyyntölomakkeelle (asiakas ei määritä hintaa). */
export type CalculatorProjectSnapshot = {
  calculatorSlug: string;
  jobSlug: string;
  calculatorTitle: string;
  primaryQty: number;
  primaryUnit: string;
  totalEuros: number;
  lowEuros: number;
  highEuros: number;
  savedAt: string;
};

const STORAGE_PREFIX = "remonttireitti-calc-snapshot:";

function storageKey(jobSlug: string): string {
  return `${STORAGE_PREFIX}${jobSlug}`;
}

export function saveCalculatorProjectSnapshot(
  snapshot: Omit<CalculatorProjectSnapshot, "savedAt">,
): void {
  if (typeof sessionStorage === "undefined") return;
  const payload: CalculatorProjectSnapshot = {
    ...snapshot,
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(storageKey(snapshot.jobSlug), JSON.stringify(payload));
}

export function loadCalculatorProjectSnapshot(
  jobSlug: string,
): CalculatorProjectSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(storageKey(jobSlug));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CalculatorProjectSnapshot;
  } catch {
    return null;
  }
}

export function clearCalculatorProjectSnapshot(jobSlug: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(storageKey(jobSlug));
}

/** Tallenna `projects.details.calculator_estimate` -kenttään. */
export function calculatorSnapshotToProjectDetails(
  snapshot: CalculatorProjectSnapshot,
): Record<string, unknown> {
  return {
    calculator_estimate: {
      slug: snapshot.calculatorSlug,
      title: snapshot.calculatorTitle,
      primary_qty: snapshot.primaryQty,
      primary_unit: snapshot.primaryUnit,
      total_euros: snapshot.totalEuros,
      low_euros: snapshot.lowEuros,
      high_euros: snapshot.highEuros,
      saved_at: snapshot.savedAt,
    },
  };
}

export type StoredCalculatorEstimate = {
  slug?: string;
  title?: string;
  primary_qty?: number;
  primary_unit?: string;
  total_euros?: number;
  low_euros?: number;
  high_euros?: number;
  saved_at?: string;
};

export function parseStoredCalculatorEstimate(
  details: Record<string, unknown> | null | undefined,
): StoredCalculatorEstimate | null {
  const raw = details?.calculator_estimate;
  if (!raw || typeof raw !== "object") return null;
  return raw as StoredCalculatorEstimate;
}

/** Yhdistä laskuriarvio projektin details-kenttään lomakkeesta. */
export function mergeCalculatorSnapshotFromFormData(
  projectDetails: Record<string, unknown>,
  formData: FormData,
): Record<string, unknown> {
  const raw = String(formData.get("calculator_snapshot_json") ?? "").trim();
  if (!raw) return projectDetails;
  try {
    const snapshot = JSON.parse(raw) as CalculatorProjectSnapshot;
    if (
      typeof snapshot.totalEuros !== "number" ||
      typeof snapshot.lowEuros !== "number" ||
      typeof snapshot.highEuros !== "number"
    ) {
      return projectDetails;
    }
    return {
      ...projectDetails,
      ...calculatorSnapshotToProjectDetails(snapshot),
    };
  } catch {
    return projectDetails;
  }
}
