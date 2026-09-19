import { PROJECT_AREAS, type ProjectAreaSlug } from "@/constants/project-areas";
import { LAMMITYS_CALCULATORS } from "./configs/lammitys";
import { LVI_CALCULATORS } from "./configs/lvi-ilma";
import { PALVELUT_CALCULATORS } from "./configs/palvelut";
import { PERUSTUS_CALCULATORS } from "./configs/perustus-runko";
import { PIHA_CALCULATORS } from "./configs/piha";
import { PUULAMMITYS_CALCULATORS } from "./configs/puulammitys";
import { SAHKO_CALCULATORS } from "./configs/sahko-energia";
import { SISATILAT_CALCULATORS } from "./configs/sisatilat";
import { ULKOKUORI_CALCULATORS } from "./configs/ulkokuori";
import type { CalculatorConfig } from "./types";

const ALL_CALCULATORS: CalculatorConfig[] = [
  ...LAMMITYS_CALCULATORS,
  ...PUULAMMITYS_CALCULATORS,
  ...SAHKO_CALCULATORS,
  ...LVI_CALCULATORS,
  ...SISATILAT_CALCULATORS,
  ...ULKOKUORI_CALCULATORS,
  ...PERUSTUS_CALCULATORS,
  ...PIHA_CALCULATORS,
  ...PALVELUT_CALCULATORS,
];

/** SEO-ystävälliset alias-URL:t → kanoninen laskurikonfigi */
const SLUG_ALIASES: Record<string, string> = {
  kylpyhuoneremontti: "kylpyhuone",
  kattoremontti: "katto-pelti",
  keittioremontti: "keittio",
  maalaus: "seinamaalaus",
};

const bySlug = new Map<string, CalculatorConfig>();
for (const calc of ALL_CALCULATORS) {
  bySlug.set(calc.slug, calc);
}
for (const [alias, target] of Object.entries(SLUG_ALIASES)) {
  const config = bySlug.get(target);
  if (config) bySlug.set(alias, config);
}

export function getAllCalculators(): CalculatorConfig[] {
  return ALL_CALCULATORS;
}

export function getCalculatorBySlug(slug: string): CalculatorConfig | null {
  return bySlug.get(slug) ?? null;
}

/** Työlajin slug → laskurikonfigi (alias-kartta mukaan). */
export function getCalculatorForJobType(
  jobTypeSlug: string | null | undefined,
): CalculatorConfig | null {
  if (!jobTypeSlug?.trim()) return null;
  return getCalculatorBySlug(jobTypeSlug.trim());
}

/** Kaikki avaimet, joilla laskurin snapshot voidaan tallentaa / lukea työlajille. */
export function calculatorSnapshotKeysForJobType(
  jobTypeSlug: string | null | undefined,
): string[] {
  if (!jobTypeSlug?.trim()) return [];
  const slug = jobTypeSlug.trim();
  const keys = new Set<string>([slug]);
  const calc = getCalculatorForJobType(slug);
  if (calc) {
    keys.add(calc.slug);
    keys.add(calc.jobSlug);
  }
  for (const [alias, target] of Object.entries(SLUG_ALIASES)) {
    if (alias === slug || target === slug) {
      keys.add(alias);
      keys.add(target);
    }
    if (calc && (target === calc.slug || target === calc.jobSlug)) {
      keys.add(alias);
    }
  }
  return [...keys];
}

export function getCalculatorSlugs(): string[] {
  return [...bySlug.keys()];
}

/** SEO-alias, jos olemassa — muuten kanoninen slug (yksi julkinen URL per laskuri). */
export function getPreferredPublicSlug(slugOrAlias: string): string {
  const config = getCalculatorBySlug(slugOrAlias);
  if (!config) return slugOrAlias;
  for (const [alias, target] of Object.entries(SLUG_ALIASES)) {
    if (target === config.slug) return alias;
  }
  return config.slug;
}

/** Sitemap / sisälinkit: yksi URL per laskuri (suosii SEO-aliasta). */
export function getSitemapCalculatorSlugs(): string[] {
  return ALL_CALCULATORS.map((c) => getPreferredPublicSlug(c.slug));
}

/** Julkinen polku — aina preferred SEO-slugiin. */
export function publicCalculatorPath(slugOrAlias: string): string {
  return calculatorPath(getPreferredPublicSlug(slugOrAlias));
}

export function getCalculatorsForArea(
  areaSlug: ProjectAreaSlug,
): CalculatorConfig[] {
  return ALL_CALCULATORS.filter((c) => c.areaSlug === areaSlug);
}

export function getCalculatorsGroupedByArea(): {
  areaSlug: ProjectAreaSlug | "extra";
  areaTitle: string;
  calculators: CalculatorConfig[];
}[] {
  const areaTitles = new Map<ProjectAreaSlug | "extra", string>(
    PROJECT_AREAS.map((a) => [a.slug, a.title] as const),
  );
  areaTitles.set("extra", "Muut laskurit");

  const groups = new Map<ProjectAreaSlug | "extra", CalculatorConfig[]>();

  for (const calc of ALL_CALCULATORS) {
    const list = groups.get(calc.areaSlug) ?? [];
    list.push(calc);
    groups.set(calc.areaSlug, list);
  }

  const order: (ProjectAreaSlug | "extra")[] = [
    ...PROJECT_AREAS.map((a) => a.slug),
    "extra",
  ];

  return order
    .filter((slug) => groups.has(slug))
    .map((slug) => ({
      areaSlug: slug,
      areaTitle: areaTitles.get(slug) ?? slug,
      calculators: groups.get(slug)!,
    }));
}

/** Raaka polku annetulla slugilla (alias tai kanoninen). Preferoi publicCalculatorPath. */
export function calculatorPath(slug: string): string {
  return `/laskurit/${slug}`;
}

/** Alias-slugit, jotka ohjaavat kanoniseen laskuriin (hakua varten). */
export function getSlugAliasesForCalculator(canonicalSlug: string): string[] {
  return Object.entries(SLUG_ALIASES)
    .filter(([, target]) => target === canonicalSlug)
    .map(([alias]) => alias);
}
