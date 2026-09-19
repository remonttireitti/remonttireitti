"use server";

import { recordLearnedProposals } from "@/lib/learned-proposals";
import { resolveProjectJobTypeSlug } from "@/lib/project-job-type";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type CalculatorLearningState = { ok?: boolean; error?: string };

export async function recordCalculatorLearningSignals(
  _prev: CalculatorLearningState,
  formData: FormData,
): Promise<CalculatorLearningState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kirjaudu");

  const projectId = String(formData.get("project_id") ?? "").trim();
  const calculatorSlug = String(formData.get("calculator_slug") ?? "").trim();
  const asSuggestion = formData.get("as_suggestion") === "1";

  let addons: string[] = [];
  let infoNeeds: string[] = [];
  try {
    const addonsRaw = String(formData.get("addons_json") ?? "[]");
    const infoRaw = String(formData.get("info_needs_json") ?? "[]");
    addons = JSON.parse(addonsRaw) as string[];
    infoNeeds = JSON.parse(infoRaw) as string[];
  } catch {
    return { error: "Virheellinen data." };
  }

  if (addons.length === 0 && infoNeeds.length === 0) {
    return { ok: true };
  }

  let jobSlug = String(formData.get("job_slug") ?? "").trim();
  if (!jobSlug && projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("job_type_id, job_types ( slug ), details")
      .eq("id", projectId)
      .maybeSingle();

    if (project) {
      jobSlug =
        resolveProjectJobTypeSlug({
          job_type_id: project.job_type_id,
          job_types: project.job_types as
            | { slug: string }
            | { slug: string }[]
            | null,
          details: project.details as Record<string, unknown> | null,
        }) ?? "";
    }
  }

  if (!jobSlug && calculatorSlug) {
    jobSlug = calculatorSlug;
  }

  await recordLearnedProposals(supabase, {
    jobSlug: jobSlug || "generic",
    addons: addons.filter((s) => typeof s === "string"),
    infoNeeds: infoNeeds.filter((s) => typeof s === "string"),
    asSuggestion,
  });

  return { ok: true };
}
