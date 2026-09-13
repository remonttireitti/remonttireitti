import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordProjectView(
  supabase: SupabaseClient,
  projectId: string,
  contractorId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("project_contractor_views").upsert(
    {
      project_id: projectId,
      contractor_id: contractorId,
      last_viewed_at: now,
    },
    { onConflict: "project_id,contractor_id", ignoreDuplicates: false },
  );

  if (error) {
    const admin = createAdminClient();
    await admin.from("project_contractor_views").upsert(
      {
        project_id: projectId,
        contractor_id: contractorId,
        last_viewed_at: now,
      },
      { onConflict: "project_id,contractor_id" },
    );
  }
}

export async function countProjectViews(
  supabase: SupabaseClient,
  projectId: string,
): Promise<number> {
  const { count } = await supabase
    .from("project_contractor_views")
    .select("contractor_id", { count: "exact", head: true })
    .eq("project_id", projectId);

  return count ?? 0;
}

export async function fetchProjectViewContractorIds(
  projectId: string,
): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_contractor_views")
    .select("contractor_id")
    .eq("project_id", projectId);

  return (data ?? []).map((r) => r.contractor_id as string);
}
