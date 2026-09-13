import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getProjectRequestTemplate,
  type ProjectRequestTemplate,
} from "@/constants/project-request-templates";

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
      label: "Hintatoive",
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

  return (
    structuredLabels[criterionId] ?? {
      label: criterionId,
      tip: "Tarkenna tätä kohtaa kuvauksessa.",
    }
  );
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
