import { MAINTENANCE_JOB_SLUGS } from "@/constants/maintenance";
import { HEAT_PUMP_JOB_SLUGS } from "@/constants/heat-pumps";

export const PRICE_ARCHIVE_MIN_SAMPLES = 3;

/** Työlajit joista hinta-arkisto koostuu (MVP: lämpöpumput). */
export const PRICE_ARCHIVE_JOB_SLUGS = [
  ...HEAT_PUMP_JOB_SLUGS,
  "lampopumppu-ilma",
  "lampopumppu-ilmavesi",
  ...MAINTENANCE_JOB_SLUGS,
] as const;

export type PriceArchiveJobSlug = (typeof PRICE_ARCHIVE_JOB_SLUGS)[number];

export const PRICE_ARCHIVE_JOB_LABELS: Record<string, string> = {
  ilmalampopumppu: "Ilmalämpöpumppu (asennus)",
  ilmavesilampopumppu: "Vesi-ilmalämpöpumppu (asennus)",
  maalampopumppu: "Maalämpöpumppu (asennus)",
  "lampopumppu-ilma": "Ilmalämpöpumppu asennus",
  "lampopumppu-ilmavesi": "Ilmavesilämpöpumppu asennus",
  "lampopumppu-huolto": "Lämpöpumpun huolto",
  "lampopumppu-korjaus": "Lämpöpumpun korjaus",
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
  if (slug === "lampopumppu-huolto" || slug === "lampopumppu-korjaus") {
    return `/huolto/uusi?tyyppi=${slug}`;
  }
  const installMap: Record<string, string> = {
    ilmalampopumppu: "ilmalampopumppu",
    ilmavesilampopumppu: "ilmavesilampopumppu",
    maalampopumppu: "maalampopumppu",
    "lampopumppu-ilma": "lampopumppu-ilma",
    "lampopumppu-ilmavesi": "lampopumppu-ilmavesi",
  };
  const tyyppi = installMap[slug];
  if (tyyppi) return `/remontti/uusi?tyyppi=${tyyppi}`;
  return "/remontti/uusi";
}
