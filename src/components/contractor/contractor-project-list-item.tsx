import Link from "next/link";
import { ProjectMatchBadges } from "@/components/contractor/contractor-service-area-form";
import { ContractorProjectInterestButtons } from "@/components/contractor/contractor-project-interest-buttons";
import { formatBudget } from "@/lib/projects";
import type { ProjectInterest } from "@/lib/contractor-work-filter";
import type { ProjectMatchResult } from "@/lib/contractor-project-match";

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
  const label = project.job_type_name ?? project.category_name;

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4 hover:border-sky-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/tarjoukset/${project.id}`} className="min-w-0 flex-1">
          <div className="flex justify-between gap-2">
            <span className="font-medium text-stone-900">{project.title}</span>
            {hasBid && (
              <span className="shrink-0 text-xs font-medium text-sky-700">
                Tarjous jätetty
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {label} · {project.municipality}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Budjetti: {formatBudget(project.budget_min, project.budget_max)}
          </p>
          {showBudgetWarning && !project.meetsMinBudget && (
            <p className="mt-1 text-xs font-medium text-amber-800">
              Alle minimibudjettisi
            </p>
          )}
          {project.interest === "interested" && (
            <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
              Kiinnostaa
            </span>
          )}
          <ProjectMatchBadges match={project.match} />
        </Link>
        <ContractorProjectInterestButtons
          projectId={project.id}
          currentInterest={project.interest}
          compact
        />
      </div>
    </li>
  );
}
