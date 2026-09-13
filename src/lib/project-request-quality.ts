import {
  getProjectRequestTemplate,
  isStructuredJobSlug,
} from "@/constants/project-request-templates";
import type { IlmalampopumppuDetails } from "@/types/ilmalampopumppu-details";
import type { IlmavesilampopumppuDetails } from "@/types/ilmavesilampopumppu-details";
import type { MaalampopumppuDetails } from "@/types/maalampopumppu-details";

export type QualityItemStatus = "done" | "missing" | "partial";

export type ProjectQualityItem = {
  id: string;
  label: string;
  tip: string;
  status: QualityItemStatus;
  weight: number;
};

export type ProjectQualityResult = {
  score: number;
  label: string;
  summary: string;
  items: ProjectQualityItem[];
};

export type ProjectQualityInput = {
  jobSlug: string | null;
  description: string;
  title?: string;
  budgetMax?: number | null;
  budgetMin?: number | null;
  desiredStart?: string | null;
  flexibilityWeeks?: number | null;
  photoCount?: number;
  tradeCount?: number;
  hasStructuredForm?: boolean;
  ilpDetails?: IlmalampopumppuDetails | null;
  ivlpDetails?: IlmavesilampopumppuDetails | null;
  maalampDetails?: MaalampopumppuDetails | null;
  /** Manually marked answered question ids from guide */
  answeredQuestionIds?: string[];
};

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function textHasKeywords(text: string, keywords: string[] | undefined): boolean {
  if (!keywords?.length) return false;
  const norm = normalizeText(text);
  return keywords.some((k) => norm.includes(normalizeText(k)));
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Erinomainen";
  if (score >= 75) return "Hyvä";
  if (score >= 55) return "Kohtalainen";
  return "Täydennä ennen julkaisua";
}

function scoreSummary(score: number): string {
  if (score >= 90) {
    return "Tarjouspyyntö on kattava — urakoitsijat voivat tarjota tarkasti.";
  }
  if (score >= 75) {
    return "Hyvä pohja. Muutama lisätieto parantaa tarjousten laatua.";
  }
  if (score >= 55) {
    return "Perustiedot ok. Täydennä puuttuvat kohdat parempien tarjousten saamiseksi.";
  }
  return "Pyyntö on vielä suppea. Täydennä kuvaus, kuvat tai aikataulu ennen julkaisua.";
}

function structuredHeatPumpItems(
  input: ProjectQualityInput,
): ProjectQualityItem[] {
  const items: ProjectQualityItem[] = [];

  const ilp = input.ilpDetails;
  const ivlp = input.ivlpDetails;
  const maal = input.maalampDetails;

  const heatedArea =
    ilp?.heated_area_m2 ??
    ivlp?.heated_area_m2 ??
    maal?.heated_area_m2 ??
    null;
  items.push({
    id: "structured_area",
    label: "Lämmitettävä alue",
    tip: "Pinta-ala auttaa laitteen valinnassa.",
    weight: 15,
    status: heatedArea != null && heatedArea > 0 ? "done" : "missing",
  });

  const propertyType =
    ilp?.property_type ?? ivlp?.property_type ?? maal?.property_type ?? "";
  items.push({
    id: "structured_property",
    label: "Rakennustyyppi",
    tip: "Omakotitalo, rivitalo tms.",
    weight: 10,
    status: propertyType.trim().length > 0 ? "done" : "missing",
  });

  const budget =
    ilp?.budget_max_eur ?? ivlp?.budget_max_eur ?? maal?.budget_max_eur ?? null;
  items.push({
    id: "structured_budget",
    label: "Hintatoive",
    tip: "Auttaa sopivien tarjousten löytymistä.",
    weight: 10,
    status: budget != null && budget > 0 ? "done" : "partial",
  });

  items.push({
    id: "structured_schedule",
    label: "Aikataulu",
    tip: "Milloin asennus voisi tapahtua?",
    weight: 10,
    status: ilp?.schedule ? "done" : ivlp || maal ? "partial" : "missing",
  });

  const pipeDistance =
    ilp?.pipe_distance_m_per_unit ??
    (ivlp as { pipe_distance_m_per_unit?: number | null } | undefined)
      ?.pipe_distance_m_per_unit ??
    null;
  items.push({
    id: "structured_install",
    label: "Asennuspaikka / putkimatka",
    tip: "Putkimatka vaikuttaa hintaan.",
    weight: 12,
    status:
      pipeDistance != null ||
      (ilp?.outdoor_mounting != null && ilp.outdoor_mounting !== "ground")
        ? "done"
        : "partial",
  });

  items.push({
    id: "structured_photos",
    label: "Kuvat asennuspaikasta",
    tip: "Valinnainen mutta hyödyllinen.",
    weight: 8,
    status: (input.photoCount ?? 0) > 0 ? "done" : "partial",
  });

  return items;
}

function criterionStatus(
  criterionId: string,
  input: ProjectQualityInput,
  criterion: { id: string; keywords?: string[] },
  combinedText: string,
): QualityItemStatus {
  if (criterionId.endsWith("_photos")) {
    return (input.photoCount ?? 0) > 0 ? "done" : "missing";
  }

  if (criterionId === "gen_desc") {
    const len = input.description.trim().length;
    if (len >= 120) return "done";
    if (len >= 40) return "partial";
    return "missing";
  }

  if (
    criterionId.includes("budget") &&
    (input.budgetMax != null || input.budgetMin != null)
  ) {
    return "done";
  }

  if (
    criterionId.includes("schedule") &&
    (input.desiredStart?.trim() || (input.flexibilityWeeks ?? 0) > 0)
  ) {
    return "done";
  }

  const answered = input.answeredQuestionIds?.some((q) =>
    q.startsWith(criterionId.split("_")[0]),
  );
  if (answered) return "done";

  if (textHasKeywords(combinedText, criterion.keywords)) return "done";

  if (criterion.keywords?.length) return "missing";
  return "partial";
}

export function scoreProjectRequest(input: ProjectQualityInput): ProjectQualityResult {
  const template = getProjectRequestTemplate(input.jobSlug);
  const combinedText = `${input.title ?? ""}\n${input.description}`.trim();

  let items: ProjectQualityItem[];

  if (
    input.hasStructuredForm ||
    isStructuredJobSlug(input.jobSlug)
  ) {
    items = structuredHeatPumpItems(input);
  } else {
    items = template.qualityCriteria.map((c) => ({
      id: c.id,
      label: c.label,
      tip: c.tip,
      weight: c.weight,
      status: criterionStatus(c.id, input, c, combinedText),
    }));

    if ((input.tradeCount ?? 0) > 0) {
      items.push({
        id: "trades",
        label: "Ammattilaiset valittu",
        tip: "Urakoitsijat tietävät ketä haetaan.",
        weight: 8,
        status: "done",
      });
    } else {
      items.push({
        id: "trades",
        label: "Ammattilaiset valittu",
        tip: "Valitse vähintään yksi ammatti.",
        weight: 8,
        status: "missing",
      });
    }
  }

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const earned = items.reduce((s, i) => {
    if (i.status === "done") return s + i.weight;
    if (i.status === "partial") return s + i.weight * 0.5;
    return s;
  }, 0);

  const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

  return {
    score,
    label: scoreLabel(score),
    summary: scoreSummary(score),
    items,
  };
}

export function scoreProjectFromRow(params: {
  jobSlug: string | null;
  title: string;
  description: string;
  budgetMax?: number | null;
  budgetMin?: number | null;
  desiredStart?: string | null;
  details?: unknown;
  photoCount?: number;
}): ProjectQualityResult {
  const details = params.details as Record<string, unknown> | null;
  const ilp = details?.ilmalampopumppu as IlmalampopumppuDetails | undefined;
  const ivlp = details?.ilmavesilampopumppu as IlmavesilampopumppuDetails | undefined;
  const maal = details?.maalampopumppu as MaalampopumppuDetails | undefined;

  return scoreProjectRequest({
    jobSlug: params.jobSlug,
    title: params.title,
    description: params.description,
    budgetMax: params.budgetMax,
    budgetMin: params.budgetMin,
    desiredStart: params.desiredStart,
    photoCount: params.photoCount,
    hasStructuredForm: Boolean(ilp || ivlp || maal),
    ilpDetails: ilp ?? null,
    ivlpDetails: ivlp ?? null,
    maalampDetails: maal ?? null,
  });
}
