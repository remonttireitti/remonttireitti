import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectCompletionRequestRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  criterion_ids: string[];
  note: string | null;
  resolved_at: string | null;
  created_at: string;
  contractorCompany?: string | null;
};

export async function fetchOpenCompletionRequestsForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectCompletionRequestRow[]> {
  const { data } = await supabase
    .from("project_completion_requests")
    .select(
      "id, project_id, contractor_id, criterion_ids, note, resolved_at, created_at",
    )
    .eq("project_id", projectId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as ProjectCompletionRequestRow[];
}

export async function fetchContractorSentCompletionRequest(
  supabase: SupabaseClient,
  projectId: string,
  contractorId: string,
): Promise<ProjectCompletionRequestRow | null> {
  const { data } = await supabase
    .from("project_completion_requests")
    .select("id, project_id, contractor_id, criterion_ids, note, resolved_at, created_at")
    .eq("project_id", projectId)
    .eq("contractor_id", contractorId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ProjectCompletionRequestRow | null) ?? null;
}
