import type { SupabaseClient } from "@supabase/supabase-js";
import { gapTypeLabel } from "@/constants/completion-gap-types";
import { criterionLabelFromTemplate } from "@/lib/template-criterion-stats";
import { getProjectRequestTemplate } from "@/constants/project-request-templates";

export type ProjectCompletionRequestRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  criterion_ids: string[];
  gap_types: string[];
  note: string | null;
  suggest_template: boolean;
  preliminary_min_cents: number | null;
  preliminary_max_cents: number | null;
  preliminary_note: string | null;
  resolved_at: string | null;
  created_at: string;
  contractorCompany?: string | null;
};

export type AggregatedCompletionNeed = {
  gapTypes: string[];
  criterionIds: string[];
  labels: string[];
  contractorNotes: string[];
  preliminaryRanges: { company: string; min: number | null; max: number | null; note: string | null }[];
};

export async function fetchOpenCompletionRequestsForProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectCompletionRequestRow[]> {
  const { data } = await supabase
    .from("project_completion_requests")
    .select(
      "id, project_id, contractor_id, criterion_ids, gap_types, note, suggest_template, preliminary_min_cents, preliminary_max_cents, preliminary_note, resolved_at, created_at",
    )
    .eq("project_id", projectId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    ...(row as Omit<ProjectCompletionRequestRow, "gap_types">),
    gap_types: (row.gap_types as string[] | null) ?? [],
    criterion_ids: (row.criterion_ids as string[] | null) ?? [],
    suggest_template: (row.suggest_template as boolean) ?? false,
  }));
}

export async function fetchContractorSentCompletionRequest(
  supabase: SupabaseClient,
  projectId: string,
  contractorId: string,
): Promise<ProjectCompletionRequestRow | null> {
  const { data } = await supabase
    .from("project_completion_requests")
    .select(
      "id, project_id, contractor_id, criterion_ids, gap_types, note, suggest_template, preliminary_min_cents, preliminary_max_cents, preliminary_note, resolved_at, created_at",
    )
    .eq("project_id", projectId)
    .eq("contractor_id", contractorId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    ...(data as Omit<ProjectCompletionRequestRow, "gap_types">),
    gap_types: (data.gap_types as string[] | null) ?? [],
    criterion_ids: (data.criterion_ids as string[] | null) ?? [],
    suggest_template: (data.suggest_template as boolean) ?? false,
  };
}

export function aggregateCompletionNeeds(
  requests: ProjectCompletionRequestRow[],
  jobSlug: string | null,
): AggregatedCompletionNeed {
  const template = getProjectRequestTemplate(jobSlug);
  const gapSet = new Set<string>();
  const criterionSet = new Set<string>();
  const notes: string[] = [];
  const preliminaryRanges: AggregatedCompletionNeed["preliminaryRanges"] = [];

  for (const req of requests) {
    for (const g of req.gap_types) gapSet.add(g);
    for (const c of req.criterion_ids) criterionSet.add(c);
    if (req.note?.trim()) notes.push(req.note.trim());
    if (req.preliminary_min_cents || req.preliminary_max_cents || req.preliminary_note) {
      preliminaryRanges.push({
        company: req.contractorCompany ?? "Urakoitsija",
        min: req.preliminary_min_cents,
        max: req.preliminary_max_cents,
        note: req.preliminary_note,
      });
    }
  }

  const labels: string[] = [];
  for (const g of gapSet) labels.push(gapTypeLabel(g));
  for (const c of criterionSet) {
    const label = criterionLabelFromTemplate(template, c).label;
    if (!labels.includes(label)) labels.push(label);
  }

  return {
    gapTypes: [...gapSet],
    criterionIds: [...criterionSet],
    labels,
    contractorNotes: notes,
    preliminaryRanges,
  };
}
