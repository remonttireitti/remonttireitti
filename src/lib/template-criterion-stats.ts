import type { SupabaseClient } from "@supabase/supabase-js";
import { gapTypeLabel } from "@/constants/completion-gap-types";
import {
  getProjectRequestTemplate,
  type ProjectRequestTemplate,
} from "@/constants/project-request-templates";

export const LEARNED_HINT_MIN = 2;
export const LEARNED_STRONG_MIN = 10;
export const LEARNED_SUGGESTION_STRONG_MIN = 5;

export type LearnedCriterionTier = "hint" | "strong";

export type LearnedCriterion = {
  id: string;
  label: string;
  tip: string;
  tier: LearnedCriterionTier;
  requestCount: number;
};

export type EmphasizedCriterion = {
  jobSlug: string;
  id: string;
  label: string;
  tip: string;
  requestCount: number;
};

export function criterionLabelFromTemplate(
  template: ProjectRequestTemplate,
  criterionId: string,
): { label: string; tip: string } {
  const fromQuality = template.qualityCriteria.find((c) => c.id === criterionId);
  if (fromQuality) {
    return { label: fromQuality.label, tip: fromQuality.tip };
  }

  const structuredLabels: Record<string, { label: string; tip: string }> = {
    structured_area: {
      label: "Lämmitettävä alue",
      tip: "Pinta-ala auttaa laitteen valinnassa.",
    },
    structured_property: {
      label: "Rakennustyyppi",
      tip: "Omakotitalo, rivitalo tms.",
    },
    structured_budget: {
      label: "Budjetti",
      tip: "Auttaa sopivien tarjousten löytymistä.",
    },
    structured_schedule: {
      label: "Aikataulu",
      tip: "Milloin työ voisi alkaa?",
    },
    structured_install: {
      label: "Asennuspaikka",
      tip: "Putkimatka ja sijoittelu vaikuttavat hintaan.",
    },
    structured_photos: {
      label: "Kuvat",
      tip: "Kuvat auttavat arvioimaan työn laajuutta.",
    },
    trades: {
      label: "Ammattilaiset",
      tip: "Valitse oikeat ammattiryhmät.",
    },
  };

  if (criterionId.startsWith("gap:")) {
    const gapId = criterionId.slice(4);
    return {
      label: gapTypeLabel(gapId),
      tip: "Urakoitsijat pyytävät tätä usein tälle työlajille.",
    };
  }

  return (
    structuredLabels[criterionId] ?? {
      label: criterionId,
      tip: "Tarkenna tätä kohtaa kuvauksessa.",
    }
  );
}

function tierFromCounts(
  requestCount: number,
  suggestionCount: number,
): LearnedCriterionTier | null {
  if (
    requestCount >= LEARNED_STRONG_MIN ||
    suggestionCount >= LEARNED_SUGGESTION_STRONG_MIN
  ) {
    return "strong";
  }
  if (requestCount >= LEARNED_HINT_MIN) {
    return "hint";
  }
  return null;
}

export async function fetchLearnedCriteria(
  supabase: SupabaseClient,
  jobSlug: string | null,
): Promise<LearnedCriterion[]> {
  const slug = jobSlug?.trim() || "generic";
  const template = getProjectRequestTemplate(jobSlug);

  const { data } = await supabase
    .from("template_criterion_stats")
    .select("criterion_id, request_count, suggestion_count")
    .eq("job_slug", slug)
    .gte("request_count", LEARNED_HINT_MIN)
    .order("request_count", { ascending: false });

  const results: LearnedCriterion[] = [];
  for (const row of data ?? []) {
    const tier = tierFromCounts(
      row.request_count as number,
      (row.suggestion_count as number) ?? 0,
    );
    if (!tier) continue;
    const meta = criterionLabelFromTemplate(
      template,
      row.criterion_id as string,
    );
    results.push({
      id: row.criterion_id as string,
      label: meta.label,
      tip: meta.tip,
      tier,
      requestCount: row.request_count as number,
    });
  }
  return results;
}

export async function fetchEmphasizedCriteria(
  supabase: SupabaseClient,
  jobSlug: string | null,
  limit = 3,
): Promise<EmphasizedCriterion[]> {
  const slug = jobSlug?.trim() || "generic";
  const template = getProjectRequestTemplate(jobSlug);

  const { data } = await supabase
    .from("template_criterion_stats")
    .select("criterion_id, request_count")
    .eq("job_slug", slug)
    .gte("request_count", 2)
    .order("request_count", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const meta = criterionLabelFromTemplate(
      template,
      row.criterion_id as string,
    );
    return {
      jobSlug: slug,
      id: row.criterion_id as string,
      label: meta.label,
      tip: meta.tip,
      requestCount: row.request_count as number,
    };
  });
}

export async function fetchAllLearnedCriteria(
  supabase: SupabaseClient,
  minTier: LearnedCriterionTier = "hint",
): Promise<(LearnedCriterion & { jobSlug: string })[]> {
  const minCount =
    minTier === "strong" ? LEARNED_STRONG_MIN : LEARNED_HINT_MIN;

  const { data } = await supabase
    .from("template_criterion_stats")
    .select("job_slug, criterion_id, request_count, suggestion_count")
    .gte("request_count", minCount)
    .order("request_count", { ascending: false })
    .limit(120);

  const results: (LearnedCriterion & { jobSlug: string })[] = [];
  for (const row of data ?? []) {
    const tier = tierFromCounts(
      row.request_count as number,
      (row.suggestion_count as number) ?? 0,
    );
    if (!tier) continue;
    if (minTier === "strong" && tier !== "strong") continue;

    const jobSlug = (row.job_slug as string) || "generic";
    const template = getProjectRequestTemplate(
      jobSlug === "generic" ? null : jobSlug,
    );
    const meta = criterionLabelFromTemplate(
      template,
      row.criterion_id as string,
    );
    results.push({
      jobSlug,
      id: row.criterion_id as string,
      label: meta.label,
      tip: meta.tip,
      tier,
      requestCount: row.request_count as number,
    });
  }
  return results;
}

export async function fetchAllEmphasizedCriteria(
  supabase: SupabaseClient,
  minCount = 2,
  limit = 80,
): Promise<EmphasizedCriterion[]> {
  const { data } = await supabase
    .from("template_criterion_stats")
    .select("job_slug, criterion_id, request_count")
    .gte("request_count", minCount)
    .order("request_count", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const jobSlug = (row.job_slug as string) || "generic";
    const template = getProjectRequestTemplate(
      jobSlug === "generic" ? null : jobSlug,
    );
    const meta = criterionLabelFromTemplate(
      template,
      row.criterion_id as string,
    );
    return {
      jobSlug,
      id: row.criterion_id as string,
      label: meta.label,
      tip: meta.tip,
      requestCount: row.request_count as number,
    };
  });
}
