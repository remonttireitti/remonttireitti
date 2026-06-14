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

/** Työlaji- tai ammattiavain → oletusehdot (JSONB). Ammatit: `trade:putki` jne. */
export type ContractorBidDefaultsByJobType = Partial<
  Record<string, ContractorBidDefaults>
>;

export const TRADE_DEFAULTS_KEY_PREFIX = "trade:";

export type BidDefaultsTab = {
  key: string;
  label: string;
  group: "Lämpöpumput" | "Ammatit";
};

export const emptyBidDefaults = (): ContractorBidDefaults => ({
  scope_terms: "",
  contract_terms: "",
  warranty_work: "",
  warranty_equipment: "",
});

export function isHeatPumpSlugKey(key: string): key is HeatPumpSlug {
  return (HEAT_PUMP_JOB_SLUGS as readonly string[]).includes(key);
}

export function tradeDefaultsKey(tradeSlug: string): string {
  return `${TRADE_DEFAULTS_KEY_PREFIX}${tradeSlug}`;
}

export function tradeSlugFromDefaultsKey(key: string): string | null {
  if (!key.startsWith(TRADE_DEFAULTS_KEY_PREFIX)) return null;
  return key.slice(TRADE_DEFAULTS_KEY_PREFIX.length) || null;
}

function parseDefaultsEntry(entry: unknown): ContractorBidDefaults | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const e = entry as Record<string, unknown>;
  return {
    scope_terms: String(e.scope_terms ?? "").trim(),
    contract_terms: String(e.contract_terms ?? "").trim(),
    warranty_work: String(e.warranty_work ?? "").trim(),
    warranty_equipment: String(e.warranty_equipment ?? "").trim(),
  };
}

function hasAnyDefaultsContent(defaults: ContractorBidDefaults): boolean {
  return !!(
    defaults.scope_terms ||
    defaults.contract_terms ||
    defaults.warranty_work ||
    defaults.warranty_equipment
  );
}

function mergeSpecificWithLegacy(
  specific: ContractorBidDefaults,
  legacy: ContractorBidDefaults,
): ContractorBidDefaults {
  return {
    scope_terms: specific.scope_terms || legacy.scope_terms,
    contract_terms: specific.contract_terms || legacy.contract_terms,
    warranty_work: specific.warranty_work || legacy.warranty_work,
    warranty_equipment:
      specific.warranty_equipment || legacy.warranty_equipment,
  };
}

/** Normalisoi JSONB / lomakedata turvalliseksi rakenteeksi. */
export function parseBidDefaultsByJobType(
  raw: unknown,
  allowedKeys?: ReadonlySet<string>,
): ContractorBidDefaultsByJobType {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: ContractorBidDefaultsByJobType = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || key.length > 80) continue;
    if (allowedKeys && !allowedKeys.has(key)) continue;
    const parsed = parseDefaultsEntry(entry);
    if (parsed) out[key] = parsed;
  }
  return out;
}

/** Yhdistää työlaji-/ammattikohtaiset oletukset ja vanhat yhteiset sarakkeet. */
export function resolveBidDefaultsForJobType(
  byJob: ContractorBidDefaultsByJobType,
  legacy: ContractorBidDefaults,
  jobTypeSlug: string | null | undefined,
  tradeSlugs: string[] = [],
): ContractorBidDefaults {
  if (jobTypeSlug) {
    const specific = byJob[jobTypeSlug];
    if (specific && hasAnyDefaultsContent(specific)) {
      return mergeSpecificWithLegacy(specific, legacy);
    }
  }

  for (const slug of tradeSlugs) {
    const tradeSpecific = byJob[tradeDefaultsKey(slug)];
    if (tradeSpecific && hasAnyDefaultsContent(tradeSpecific)) {
      return mergeSpecificWithLegacy(tradeSpecific, legacy);
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

export function buildBidDefaultsTabs(input: {
  jobTypeSlugs: string[];
  trades: { slug: string; name_fi: string }[];
  heatPumpLabels: Record<HeatPumpSlug, { title: string }>;
}): BidDefaultsTab[] {
  const tabs: BidDefaultsTab[] = [];

  for (const slug of input.jobTypeSlugs) {
    if (!isHeatPumpSlugKey(slug)) continue;
    tabs.push({
      key: slug,
      label: input.heatPumpLabels[slug].title,
      group: "Lämpöpumput",
    });
  }

  for (const trade of input.trades) {
    tabs.push({
      key: tradeDefaultsKey(trade.slug),
      label: trade.name_fi,
      group: "Ammatit",
    });
  }

  return tabs;
}

export function buildInitialDefaultsByKey(
  tabs: BidDefaultsTab[],
  legacy: ContractorBidDefaults,
  byJob: ContractorBidDefaultsByJobType,
): Record<string, ContractorBidDefaults> {
  const out: Record<string, ContractorBidDefaults> = {};
  for (const tab of tabs) {
    const saved = byJob[tab.key];
    out[tab.key] = saved
      ? mergeSpecificWithLegacy(saved, legacy)
      : { ...legacy };
  }
  return out;
}

export function allowedBidDefaultsKeys(tabs: BidDefaultsTab[]): Set<string> {
  return new Set(tabs.map((t) => t.key));
}
