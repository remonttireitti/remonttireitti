import { createAdminClient } from "@/lib/supabase/admin";
import type { JobDemandSignalRow } from "@/lib/custom-job-demand";

export async function fetchJobDemandSignals(
  limit = 50,
): Promise<JobDemandSignalRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_demand_signals")
    .select(
      "normalized_key, sample_label, project_count, first_seen_at, last_seen_at",
    )
    .order("project_count", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[fetchJobDemandSignals]", error.code, error.message);
    return [];
  }

  return (data ?? []) as JobDemandSignalRow[];
}
