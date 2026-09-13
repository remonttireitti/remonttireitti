import type { SupabaseClient } from "@supabase/supabase-js";
import { gapTypeLabel } from "@/constants/completion-gap-types";
import { criterionLabelFromTemplate } from "@/lib/template-criterion-stats";
import { getProjectRequestTemplate } from "@/constants/project-request-templates";
import {
  fetchContractorOpenCompletionRequest,
  fetchOpenCompletionRequests,
  type ProjectCompletionRequestRow,
} from "@/lib/completion-request-persist";

export type { ProjectCompletionRequestRow };

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
  return fetchOpenCompletionRequests(supabase, projectId);
}

export async function fetchContractorSentCompletionRequest(
  supabase: SupabaseClient,
  projectId: string,
  contractorId: string,
): Promise<ProjectCompletionRequestRow | null> {
  return fetchContractorOpenCompletionRequest(supabase, projectId, contractorId);
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
