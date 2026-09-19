import { calculatorSnapshotKeysForJobType } from "@/lib/calculators/registry";

/** Laskurin tulos, joka kulkee tarjouspyyntölomakkeelle (ei rivihintoja). */
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

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function saveCalculatorProjectSnapshot(
  snapshot: Omit<CalculatorProjectSnapshot, "savedAt">,
): void {
  if (typeof sessionStorage === "undefined") return;
  const payload: CalculatorProjectSnapshot = {
    ...snapshot,
    savedAt: new Date().toISOString(),
  };
  const json = JSON.stringify(payload);
  const keys = new Set([
    snapshot.jobSlug,
    snapshot.calculatorSlug,
    ...calculatorSnapshotKeysForJobType(snapshot.jobSlug),
    ...calculatorSnapshotKeysForJobType(snapshot.calculatorSlug),
  ]);
  for (const key of keys) {
    if (key) sessionStorage.setItem(storageKey(key), json);
  }
}

export function loadCalculatorProjectSnapshot(
  key: string,
): CalculatorProjectSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(storageKey(key));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CalculatorProjectSnapshot;
  } catch {
    return null;
  }
}

/** Lue laskuriarvo työlajin slugilla (kattoremontti, kylpyhuone, …). */
export function loadSnapshotForJobType(
  jobTypeSlug: string,
): CalculatorProjectSnapshot | null {
  for (const key of calculatorSnapshotKeysForJobType(jobTypeSlug)) {
    const snapshot = loadCalculatorProjectSnapshot(key);
    if (snapshot) return snapshot;
  }
  return null;
}

export function clearCalculatorProjectSnapshot(jobTypeSlug: string): void {
  if (typeof sessionStorage === "undefined") return;
  for (const key of calculatorSnapshotKeysForJobType(jobTypeSlug)) {
    sessionStorage.removeItem(storageKey(key));
  }
}

/** Budjetin viitearvo laskurin ylärajasta (pyöristetty 100 €:n tarkkuuteen). */
export function suggestedBudgetMaxEuros(
  snapshot: CalculatorProjectSnapshot,
): number {
  return Math.round(snapshot.highEuros / 100) * 100;
}

/** Tallenna `projects.details.calculator_estimate` — vain kokonaissummat, ei rivihintoja. */
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
