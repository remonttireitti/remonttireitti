import { PUBLIC_PROJECT_JOB_SLUGS } from "@/constants/project-areas";
import { MAINTENANCE_JOB_SLUGS } from "@/constants/maintenance";
import { HEAT_PUMP_JOB_SLUGS } from "@/constants/heat-pumps";
import { SERVICE_JOB_SLUGS } from "@/constants/service-jobs";

export const PRICE_ARCHIVE_MIN_SAMPLES = 3;

/** Legacy slugit joita voi esiintyä vanhoissa riveissä. */
const LEGACY_ARCHIVE_SLUGS = [
  "lampopumppu-ilma",
  "lampopumppu-ilmavesi",
] as const;

/**
 * Kaikki remontti- ja huoltotyypit joista hinta-arkisto voi koostua.
 * Näytetään vain työlajit joilla vähintään PRICE_ARCHIVE_MIN_SAMPLES hyväksyttyä urakkaa.
 */
export const PRICE_ARCHIVE_JOB_SLUGS = [
  ...new Set([
    ...PUBLIC_PROJECT_JOB_SLUGS,
    ...HEAT_PUMP_JOB_SLUGS,
    ...MAINTENANCE_JOB_SLUGS,
    ...SERVICE_JOB_SLUGS,
    ...LEGACY_ARCHIVE_SLUGS,
  ]),
] as readonly string[];

export type PriceArchiveJobSlug = string;

export const PRICE_ARCHIVE_JOB_LABELS: Record<string, string> = {
  ilmalampopumppu: "Ilmalämpöpumppu (asennus)",
  ilmavesilampopumppu: "Vesi-ilmalämpöpumppu (asennus)",
  maalampopumppu: "Maalämpöpumppu (asennus)",
  "lampopumppu-ilma": "Ilmalämpöpumppu asennus",
  "lampopumppu-ilmavesi": "Ilmavesilämpöpumppu asennus",
  "lampopumppu-huolto": "Lämpöpumpun huolto",
  "lampopumppu-korjaus": "Lämpöpumpun korjaus",
  keittio: "Keittiöremontti",
  kylpyhuone: "Kylpyhuoneremontti",
  "katto-pelti": "Kattoremontti (pelti)",
  "wc-remontti": "WC-remontti",
  sauna: "Saunaremontti",
  ikkunat: "Ikkunoiden vaihto",
  ulkomaalaus: "Ulkomaalaus",
  aurinkopaneelit: "Aurinkopaneelit",
  latauspiste: "Latauspiste",
};

export type PriceArchiveStat = {
  jobSlug: string;
  jobName: string;
  sampleCount: number;
  medianCents: number;
  minCents: number;
  maxCents: number;
  regionLabel: string | null;
};

export function priceArchiveJobLabel(slug: string, fallback?: string): string {
  return PRICE_ARCHIVE_JOB_LABELS[slug] ?? fallback ?? slug;
}

export function medianCents(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

export function postalRegionPrefix(postalCode: string): string | null {
  const digits = postalCode.replace(/\D/g, "");
  if (digits.length < 2) return null;
  return digits.slice(0, 2);
}

export function normalizePostalFilter(value: string): string {
  return value.replace(/\D/g, "").slice(0, 5);
}

export function ctaHrefForJobSlug(slug: string): string {
  if (
    slug === "lampopumppu-huolto" ||
    slug === "lampopumppu-korjaus" ||
    (MAINTENANCE_JOB_SLUGS as readonly string[]).includes(slug)
  ) {
    return `/huolto/uusi?tyyppi=${slug}`;
  }
  if ((SERVICE_JOB_SLUGS as readonly string[]).includes(slug)) {
    return `/remontti/uusi?tyyppi=${slug}`;
  }
  return `/remontti/uusi?tyyppi=${slug}`;
}
