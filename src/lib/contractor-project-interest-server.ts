import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectInterest } from "@/lib/contractor-work-filter";

export type ContractorProjectInterestRow = {
  project_id: string;
  interest: ProjectInterest;
};

export async function fetchContractorProjectInterests(
  supabase: SupabaseClient,
  contractorId: string,
  projectIds?: string[],
): Promise<Map<string, ProjectInterest>> {
  let query = supabase
    .from("contractor_project_interest")
    .select("project_id, interest")
    .eq("contractor_id", contractorId);

  if (projectIds && projectIds.length > 0) {
    query = query.in("project_id", projectIds);
  }

  const { data } = await query;
  const map = new Map<string, ProjectInterest>();
  for (const row of data ?? []) {
    map.set(row.project_id as string, row.interest as ProjectInterest);
  }
  return map;
}

export async function fetchProjectInterest(
  supabase: SupabaseClient,
  contractorId: string,
  projectId: string,
): Promise<ProjectInterest | null> {
  const { data } = await supabase
    .from("contractor_project_interest")
    .select("interest")
    .eq("contractor_id", contractorId)
    .eq("project_id", projectId)
    .maybeSingle();

  return (data?.interest as ProjectInterest | undefined) ?? null;
}
