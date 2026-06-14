import {
  customRequestLabelFromDetails,
  FREE_FORM_JOB_SLUG,
  isFreeFormJobSlug,
} from "@/constants/free-form-job";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordCustomJobDemand(
  supabase: SupabaseClient,
  projectId: string,
  jobTypeSlug: string | null,
  title: string,
  details: unknown,
): Promise<void> {
  if (!isFreeFormJobSlug(jobTypeSlug)) return;

  const label =
    customRequestLabelFromDetails(details) ?? title.trim();
  if (label.length < 3) return;

  const { error } = await supabase.rpc("record_job_demand_signal", {
    p_label: label,
    p_project_id: projectId,
  });

  if (error) {
    console.error("[recordCustomJobDemand]", error.code, error.message);
  }
}

export async function fetchJobTypeSlug(
  supabase: SupabaseClient,
  jobTypeId: string | null,
): Promise<string | null> {
  if (!jobTypeId) return null;
  const { data } = await supabase
    .from("job_types")
    .select("slug")
    .eq("id", jobTypeId)
    .maybeSingle();
  return data?.slug ?? null;
}

export type JobDemandSignalRow = {
  normalized_key: string;
  sample_label: string;
  project_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

export { FREE_FORM_JOB_SLUG };
