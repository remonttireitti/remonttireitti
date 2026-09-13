import { HEAT_PUMP_JOB_SLUGS } from "@/constants/heat-pumps";
import { bidTotalAmountCents } from "@/lib/bid-amounts";
import { formatEurosFromCents } from "@/lib/bids";

export type BidScopeCheckItem = {
  id: string;
  label: string;
  keywords: string[];
  /** Also check these bid text fields */
  fields?: ("warranty_work" | "warranty_equipment" | "contract_terms")[];
};

export type BidInsightInput = {
  id: string;
  label: string;
  amountCents: number;
  scopeTerms: string | null;
  warrantyWork: string | null;
  warrantyEquipment: string | null;
  contractTerms: string | null;
  estimatedDays: number | null;
  earliestStartDate: string | null;
  message: string | null;
};

export type BidInsightResult = {
  bidId: string;
  bidLabel: string;
  amountLabel: string;
  coveredItems: string[];
  missingItems: string[];
  partialItems: string[];
  strengths: string[];
  questions: string[];
};

export type ComparisonInsightSummary = {
  bidInsights: BidInsightResult[];
  highlights: string[];
  questionsForContractors: string[];
};

const HEAT_PUMP_SCOPE: BidScopeCheckItem[] = [
  {
    id: "installation",
    label: "Asennus ja käyttöönotto",
    keywords: ["asennus", "käyttöönotto", "käyttöön", "asetukset"],
  },
  {
    id: "refrigerant",
    label: "Kylmäaineputkisto",
    keywords: ["kylmäaine", "putk", "tyhjö", "tyhjiö"],
  },
  {
    id: "electrical",
    label: "Sähkötyöt",
    keywords: ["sähk", "kytkent", "sulake"],
  },
  {
    id: "condensate",
    label: "Kondenssiveden poisto",
    keywords: ["kondenss", "kondensaatio", "sulatus"],
  },
  {
    id: "mounting",
    label: "Telineet / läpiviennit",
    keywords: ["teline", "kiinnity", "läpivient", "poraus"],
  },
  {
    id: "warranty",
    label: "Takuu",
    keywords: ["takuu"],
    fields: ["warranty_work", "warranty_equipment"],
  },
  {
    id: "documentation",
    label: "Dokumentointi / opastus",
    keywords: ["dokument", "ohje", "opastus"],
  },
];

const ROOF_SCOPE: BidScopeCheckItem[] = [
  { id: "removal", label: "Vanhan katon purku", keywords: ["purku", "poisto"] },
  { id: "installation", label: "Uuden kattomateriaalin asennus", keywords: ["asennus", "kate", "pelti", "tiili"] },
  { id: "insulation", label: "Eristys", keywords: ["eriste", "eristys"] },
  { id: "gutters", label: "Rännit / kourut", keywords: ["ränn", "kouru", "sadevesi"] },
  { id: "safety", label: "Kattoturva / työturva", keywords: ["turva", "kaide", "teline"] },
  { id: "warranty", label: "Takuu", keywords: ["takuu"], fields: ["warranty_work"] },
];

const LVI_SCOPE: BidScopeCheckItem[] = [
  { id: "diagnosis", label: "Kartoitus / mittaus", keywords: ["kartoitus", "mittaus", "tarkastus"] },
  { id: "materials", label: "Materiaalit", keywords: ["materiaal", "putki", "liitin"] },
  { id: "installation", label: "Asennus / korjaus", keywords: ["asennus", "korjaus", "uusinta"] },
  { id: "testing", label: "Testaus / käyttöönotto", keywords: ["testi", "käyttöönotto", "ilmaus"] },
  { id: "warranty", label: "Takuu", keywords: ["takuu"], fields: ["warranty_work"] },
];

const GENERIC_SCOPE: BidScopeCheckItem[] = [
  { id: "scope", label: "Työn sisältö kuvattu", keywords: ["sisält", "hinta sisält", "urakka"] },
  { id: "materials", label: "Materiaalit", keywords: ["materiaal", "tarvike"] },
  { id: "timeline", label: "Aikataulu", keywords: ["aloitus", "kesto", "päiv", "viikko"] },
  { id: "warranty", label: "Takuu", keywords: ["takuu"], fields: ["warranty_work", "warranty_equipment"] },
  { id: "terms", label: "Sopimusehdot", keywords: ["ehto", "maksu", "sopimus"], fields: ["contract_terms"] },
];

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function scopeItemsForJob(jobSlug: string | null): BidScopeCheckItem[] {
  if (jobSlug && (HEAT_PUMP_JOB_SLUGS as readonly string[]).includes(jobSlug as never)) {
    return HEAT_PUMP_SCOPE;
  }
  if (
    jobSlug &&
    ["katto-pelti", "rannit", "ulkomaalaus", "julkisivu-verhous", "julkisivu-rapaus"].includes(
      jobSlug,
    )
  ) {
    return ROOF_SCOPE;
  }
  if (
    jobSlug &&
    ["ilmanvaihto-kone", "ilmanvaihto-puhdistus", "kayttovesi", "viemari", "vesivahinko"].includes(
      jobSlug,
    )
  ) {
    return LVI_SCOPE;
  }
  return GENERIC_SCOPE;
}

function fieldText(
  bid: BidInsightInput,
  field: NonNullable<BidScopeCheckItem["fields"]>[number],
): string {
  switch (field) {
    case "warranty_work":
      return bid.warrantyWork ?? "";
    case "warranty_equipment":
      return bid.warrantyEquipment ?? "";
    case "contract_terms":
      return bid.contractTerms ?? "";
  }
}

function checkScopeItem(
  bid: BidInsightInput,
  item: BidScopeCheckItem,
): "covered" | "missing" | "partial" {
  if (item.id === "timeline") {
    if (bid.estimatedDays != null && bid.estimatedDays > 0) return "covered";
    if (bid.earliestStartDate?.trim()) return "covered";
  }
  if (item.id === "warranty" && bid.warrantyWork?.trim()) return "covered";
  if (item.id === "terms" && bid.contractTerms?.trim()) return "covered";

  const texts = [
    bid.scopeTerms ?? "",
    bid.message ?? "",
    ...(item.fields?.map((f) => fieldText(bid, f)) ?? []),
  ];
  const combined = normalize(texts.join("\n"));

  const hasExplicitExclude = combined.includes("ei sisäll") && item.keywords.some((k) => combined.includes(normalize(k)));
  if (hasExplicitExclude) return "missing";

  const keywordHit = item.keywords.some((k) => combined.includes(normalize(k)));
  if (keywordHit) return "covered";

  if (item.fields?.some((f) => fieldText(bid, f).trim().length > 10)) {
    return "partial";
  }

  if (!bid.scopeTerms?.trim()) return "missing";
  return "partial";
}

export function analyzeSingleBid(
  bid: BidInsightInput,
  jobSlug: string | null,
): BidInsightResult {
  return analyzeBid(bid, scopeItemsForJob(jobSlug), "Tarjous");
}

export function scopeCheckItemsForJob(jobSlug: string | null): BidScopeCheckItem[] {
  return scopeItemsForJob(jobSlug);
}

function analyzeBid(
  bid: BidInsightInput,
  items: BidScopeCheckItem[],
  label: string,
): BidInsightResult {
  const coveredItems: string[] = [];
  const missingItems: string[] = [];
  const partialItems: string[] = [];
  const strengths: string[] = [];
  const questions: string[] = [];

  for (const item of items) {
    const status = checkScopeItem(bid, item);
    if (status === "covered") coveredItems.push(item.label);
    else if (status === "partial") partialItems.push(item.label);
    else missingItems.push(item.label);
  }

  if (bid.estimatedDays != null) {
    strengths.push(`Arvioitu kesto ${bid.estimatedDays} pv`);
  }
  if (bid.earliestStartDate) {
    strengths.push(`Aloitus ${new Date(bid.earliestStartDate).toLocaleDateString("fi-FI")}`);
  }
  if (bid.warrantyWork?.trim()) {
    strengths.push("Työn takuu mainittu");
  }

  for (const missing of missingItems) {
    questions.push(`Sisältyykö tarjoukseen: ${missing.toLowerCase()}?`);
  }
  for (const partial of partialItems) {
    questions.push(`Tarkenna tarjouksessa: ${partial.toLowerCase()}.`);
  }

  return {
    bidId: bid.id,
    bidLabel: label,
    amountLabel: formatEurosFromCents(bid.amountCents),
    coveredItems,
    missingItems,
    partialItems,
    strengths,
    questions,
  };
}

export function analyzeBidComparison(
  bids: BidInsightInput[],
  bidLabels: Record<string, string>,
  jobSlug: string | null,
): ComparisonInsightSummary | null {
  const submitted = bids.filter((b) => b.amountCents > 0);
  if (submitted.length < 1) return null;

  const items = scopeItemsForJob(jobSlug);
  const bidInsights = submitted.map((b) =>
    analyzeBid(b, items, bidLabels[b.id] ?? "Tarjous"),
  );

  const highlights: string[] = [];
  const questionsSet = new Set<string>();

  if (submitted.length >= 2) {
    const sorted = [...submitted].sort(
      (a, b) => bidTotalAmountCents(a as never) - bidTotalAmountCents(b as never),
    );
    const cheapest = sorted[0];
    const priciest = sorted[sorted.length - 1];
    const cheapInsight = bidInsights.find((i) => i.bidId === cheapest.id)!;
    const priceyInsight = bidInsights.find((i) => i.bidId === priciest.id)!;

    if (cheapInsight.missingItems.length > 0) {
      highlights.push(
        `${cheapInsight.bidLabel} (${cheapInsight.amountLabel}) on edullisin, mutta tarjouksen tekstistä puuttuu: ${cheapInsight.missingItems.slice(0, 3).join(", ")}.`,
      );
    } else if (cheapInsight.partialItems.length > 0) {
      highlights.push(
        `${cheapInsight.bidLabel} on edullisin — tarkista vielä: ${cheapInsight.partialItems.slice(0, 2).join(", ")}.`,
      );
    }

    const expensiveExtras = priceyInsight.coveredItems.filter(
      (c) => !cheapInsight.coveredItems.includes(c),
    );
    if (expensiveExtras.length > 0 && cheapest.id !== priciest.id) {
      highlights.push(
        `${priceyInsight.bidLabel} (${priceyInsight.amountLabel}) mainitsee enemmän: ${expensiveExtras.slice(0, 3).join(", ")}.`,
      );
    }

    const priceDiff = bidTotalAmountCents(priciest as never) - bidTotalAmountCents(cheapest as never);
    if (priceDiff > 0) {
      highlights.push(
        `Hintaero halvimman ja kalleimman välillä: ${formatEurosFromCents(priceDiff)}.`,
      );
    }
  }

  for (const insight of bidInsights) {
    for (const q of insight.questions.slice(0, 2)) {
      questionsSet.add(q);
    }
  }

  return {
    bidInsights,
    highlights,
    questionsForContractors: [...questionsSet].slice(0, 5),
  };
}

export function bidInsightInputFromRow(bid: {
  id: string;
  amount_cents: number;
  equipment_amount_cents?: number | null;
  offers_equipment?: boolean | null;
  scope_terms?: string | null;
  warranty_work?: string | null;
  warranty_equipment?: string | null;
  contract_terms?: string | null;
  estimated_days?: number | null;
  earliest_start_date?: string | null;
  message?: string | null;
}): BidInsightInput {
  return {
    id: bid.id,
    label: bid.id,
    amountCents: bidTotalAmountCents(bid as never),
    scopeTerms: bid.scope_terms ?? null,
    warrantyWork: bid.warranty_work ?? null,
    warrantyEquipment: bid.warranty_equipment ?? null,
    contractTerms: bid.contract_terms ?? null,
    estimatedDays: bid.estimated_days ?? null,
    earliestStartDate: bid.earliest_start_date ?? null,
    message: bid.message ?? null,
  };
}
