import { ContractorProjectsTable } from "@/components/contractor/contractor-projects-table";
import type { ProjectInterest } from "@/lib/contractor-work-filter";
import type { ProjectMatchResult } from "@/lib/contractor-project-match";

/**
 * @deprecated Prefer ContractorProjectsTable for list UIs.
 * Kept as a thin single-row wrapper for any remaining call sites.
 */
export function ContractorProjectListItem({
  project,
  hasBid,
  showBudgetWarning,
}: {
  project: {
    id: string;
    title: string;
    municipality: string;
    budget_min: number | null;
    budget_max: number | null;
    job_type_name: string | null;
    category_name: string;
    match: ProjectMatchResult;
    interest: ProjectInterest | null;
    meetsMinBudget: boolean;
  };
  hasBid: boolean;
  showBudgetWarning: boolean;
}) {
  return (
    <ContractorProjectsTable
      projects={[project]}
      bidProjectIds={hasBid ? new Set([project.id]) : new Set()}
      showBudgetWarning={showBudgetWarning}
    />
  );
}
