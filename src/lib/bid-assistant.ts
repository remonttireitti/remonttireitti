import {
  analyzeSingleBid,
  scopeCheckItemsForJob,
  type BidInsightInput,
  type BidInsightResult,
} from "@/lib/bid-comparison-insights";
import type { BidFormFields } from "@/lib/bid-form";
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

export function analyzeBidAssistant(
  fields: BidFormFields,
  jobSlug: string | null,
  projectQuality?: ProjectQualityResult | null,
): BidAssistantResult {
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
