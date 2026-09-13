import {
  analyzeSingleBid,
  scopeCheckItemsForJob,
  type BidInsightInput,
  type BidInsightResult,
} from "@/lib/bid-comparison-insights";
import type { BidFormFields } from "@/lib/bid-form";
import {
  findScopeLineIndexByItemId,
  NON_SCOPE_LINE_ITEM_IDS,
  scopeLineFilled,
  type BidScopeLine,
} from "@/lib/bid-scope-lines";
import type { ProjectQualityItem, ProjectQualityResult } from "@/lib/project-request-quality";

export type BidAssistantResult = {
  completenessScore: number;
  completenessLabel: string;
  insight: BidInsightResult;
  projectGaps: ProjectQualityItem[];
};

const SCOPE_SUGGESTIONS: Record<string, string> = {
  installation: "• Asennus ja käyttöönotto",
  materials: "• Materiaalit ja tarvikkeet (erittele erikseen)",
  timeline: "• Arvioitu työn kesto ja aloitusaika",
  warranty: "• Takuu työlle (vuosia / ehdot)",
  terms: "• Maksuehdot ja sopimusehdot",
  scope: "• Työn sisältö ja rajaukset (mitä hinta sisältää / ei sisällä)",
  removal: "• Vanhan materiaalin purku ja jätehuolto",
  insulation: "• Eristys (tyyppi, paksuus, tuulenpitävyys)",
  gutters: "• Rännit ja kourut",
  safety: "• Työturva ja kattoturva",
  diagnosis: "• Kartoitus ja mittaus ennen työtä",
  testing: "• Testaus ja käyttöönotto",
  refrigerant: "• Kylmäaineputkisto ja tyhjiötyö",
  electrical: "• Sähkötyöt ja kytkentä",
  condensate: "• Kondenssiveden poisto",
  mounting: "• Telineet, kiinnitykset ja läpiviennit",
  documentation: "• Dokumentointi ja käyttöopastus",
};

function completenessLabel(score: number): string {
  if (score >= 90) return "Selkeä tarjous";
  if (score >= 75) return "Hyvä pohja";
  if (score >= 50) return "Täydennä vielä";
  return "Puutteita laajuudessa";
}

export function bidInsightInputFromFormFields(fields: BidFormFields): BidInsightInput {
  const amountCents = Math.max(0, Math.round((Number(fields.amount_euros) || 0) * 100));
  const equipCents =
    fields.offers_equipment && fields.equipment_amount_euros
      ? Math.round((Number(fields.equipment_amount_euros) || 0) * 100)
      : 0;

  return {
    id: "draft",
    label: "Luonnos",
    amountCents: amountCents + equipCents || 1,
    scopeTerms: fields.scope_terms || null,
    warrantyWork: fields.warranty_work || null,
    warrantyEquipment: fields.warranty_equipment || null,
    contractTerms: fields.contract_terms || null,
    estimatedDays: fields.estimated_days ? Number(fields.estimated_days) : null,
    earliestStartDate: fields.earliest_start_date || null,
    message: fields.message || null,
  };
}

export function bidCompletenessScore(insight: BidInsightResult): number {
  const total =
    insight.coveredItems.length +
    insight.partialItems.length +
    insight.missingItems.length;
  if (total === 0) return 0;

  const earned =
    insight.coveredItems.length + insight.partialItems.length * 0.5;
  return Math.round((earned / total) * 100);
}

export function scopeSuggestionForItem(itemId: string, label: string): string {
  return SCOPE_SUGGESTIONS[itemId] ?? `• ${label}`;
}

/** Otsikko erilliselle laajuuskentälle (ilman luettelomerkkiä). */
export function scopeLineLabelForItem(itemId: string, fallbackLabel: string): string {
  return scopeSuggestionForItem(itemId, fallbackLabel).replace(/^•\s*/, "").trim();
}

export type BidAssistantTargetField =
  | "scope_terms"
  | "warranty_work"
  | "contract_terms";

/** Mihin kenttään avustajan ehdotus lisätään (timeline = oma lomakekenttä yllä). */
export function assistantTargetForItem(itemId: string): BidAssistantTargetField | null {
  if (itemId === "warranty") return "warranty_work";
  if (itemId === "terms") return "contract_terms";
  if (itemId === "timeline") return null;
  return "scope_terms";
}

export function assistantActionLabel(
  target: BidAssistantTargetField | null,
): string | null {
  if (target === "warranty_work") return "Siirry takuukenttään ↑";
  if (target === "contract_terms") return "Siirry sopimusehtoihin ↑";
  if (target === "scope_terms") return "Siirry kenttään ↑";
  return null;
}

function dedicatedFieldFilled(itemId: string, fields: BidFormFields): boolean {
  if (itemId === "timeline") {
    return (
      (fields.estimated_days !== "" && Number(fields.estimated_days) > 0) ||
      fields.earliest_start_date.trim().length > 0
    );
  }
  if (itemId === "warranty") return fields.warranty_work.trim().length >= 4;
  if (itemId === "terms") return fields.contract_terms.trim().length >= 4;
  return false;
}

/** Laajuusrivit + omat kentät — sama logiikka kuin tarjouspyynnön ohjattu lomake. */
export function analyzeBidAssistantWithScopeLines(
  fields: BidFormFields,
  scopeLines: BidScopeLine[],
  jobSlug: string | null,
  projectQuality?: ProjectQualityResult | null,
): BidAssistantResult {
  const items = scopeCheckItemsForJob(jobSlug);
  const coveredItems: string[] = [];
  const missingItems: string[] = [];
  const partialItems: string[] = [];
  const strengths: string[] = [];

  for (const item of items) {
    if (NON_SCOPE_LINE_ITEM_IDS.has(item.id)) {
      if (dedicatedFieldFilled(item.id, fields)) {
        coveredItems.push(item.label);
      } else {
        missingItems.push(item.label);
      }
      continue;
    }

    const idx = findScopeLineIndexByItemId(scopeLines, item.id);
    if (idx >= 0) {
      const line = scopeLines[idx]!;
      if (scopeLineFilled(line)) coveredItems.push(item.label);
      else if (line.value.trim()) partialItems.push(item.label);
      else missingItems.push(item.label);
      continue;
    }

    const input = bidInsightInputFromFormFields(fields);
    const legacy = analyzeSingleBid(input, jobSlug);
    if (legacy.coveredItems.includes(item.label)) coveredItems.push(item.label);
    else if (legacy.partialItems.includes(item.label)) partialItems.push(item.label);
    else missingItems.push(item.label);
  }

  if (fields.estimated_days && Number(fields.estimated_days) > 0) {
    strengths.push(`Arvioitu kesto ${fields.estimated_days} pv`);
  }
  if (fields.earliest_start_date) {
    strengths.push(
      `Aloitus ${new Date(fields.earliest_start_date).toLocaleDateString("fi-FI")}`,
    );
  }
  if (fields.warranty_work.trim()) strengths.push("Työn takuu mainittu");

  const insight: BidInsightResult = {
    bidId: "draft",
    bidLabel: "Tarjous",
    amountLabel: "",
    coveredItems,
    missingItems,
    partialItems,
    strengths,
    questions: missingItems.map((m) => `Puuttuu: ${m}`),
  };

  const completenessScore = bidCompletenessScore(insight);
  const projectGaps =
    projectQuality?.items.filter((i) => i.status !== "done").slice(0, 4) ?? [];

  return {
    completenessScore,
    completenessLabel: completenessLabel(completenessScore),
    insight,
    projectGaps,
  };
}

export function assistantTimelineHint(): string {
  return "Täytä arvioitu kesto ja aloituspäivä lomakkeen yläosassa.";
}

export function analyzeBidAssistant(
  fields: BidFormFields,
  jobSlug: string | null,
  projectQuality?: ProjectQualityResult | null,
  scopeLines?: BidScopeLine[],
): BidAssistantResult {
  if (scopeLines && scopeLines.length > 0) {
    return analyzeBidAssistantWithScopeLines(
      fields,
      scopeLines,
      jobSlug,
      projectQuality,
    );
  }

  const input = bidInsightInputFromFormFields(fields);
  const insight = analyzeSingleBid(input, jobSlug);
  const completenessScore = bidCompletenessScore(insight);

  const projectGaps =
    projectQuality?.items.filter((i) => i.status !== "done").slice(0, 4) ?? [];

  return {
    completenessScore,
    completenessLabel: completenessLabel(completenessScore),
    insight,
    projectGaps,
  };
}

export function missingScopeItemIds(
  jobSlug: string | null,
  insight: BidInsightResult,
  fields?: BidFormFields,
): string[] {
  const items = scopeCheckItemsForJob(jobSlug);
  const missingLabels = new Set([
    ...insight.missingItems,
    ...insight.partialItems,
  ]);
  return items
    .filter((item) => missingLabels.has(item.label))
    .filter((item) => {
      if (!fields) return true;
      if (item.id === "timeline") {
        return (
          !(fields.estimated_days && Number(fields.estimated_days) > 0) &&
          !fields.earliest_start_date.trim()
        );
      }
      if (item.id === "warranty") return !fields.warranty_work.trim();
      if (item.id === "terms") return !fields.contract_terms.trim();
      return true;
    })
    .map((item) => item.id);
}
