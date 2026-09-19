import {
  AdminGridCard,
  adminGridClassName,
} from "@/components/admin/admin-grid-card";
import { ProjectMatchBadges } from "@/components/contractor/contractor-service-area-form";
import { ContractorProjectInterestButtons } from "@/components/contractor/contractor-project-interest-buttons";
import { formatBudget } from "@/lib/projects";
import type { ProjectInterest } from "@/lib/contractor-work-filter";
import type { ProjectMatchResult } from "@/lib/contractor-project-match";

export type ContractorProjectTableItem = {
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

function statusBits(project: ContractorProjectTableItem, hasBid: boolean) {
  const parts: string[] = [];
  if (hasBid) parts.push("Tarjous jätetty");
  if (project.interest === "interested") parts.push("Kiinnostaa");
  if (project.interest === "not_interested") parts.push("Ei kiinnosta");
  return parts.length > 0 ? parts.join(" · ") : "Avoin";
}

export function ContractorProjectsTable({
  projects,
  bidProjectIds,
  showBudgetWarning = false,
  className = "",
}: {
  projects: ContractorProjectTableItem[];
  bidProjectIds: ReadonlySet<string>;
  showBudgetWarning?: boolean;
  className?: string;
}) {
  return (
    <div className={`${adminGridClassName} ${className}`.trim()}>
      {projects.map((project) => {
        const hasBid = bidProjectIds.has(project.id);
        const label = project.job_type_name ?? project.category_name;

        return (
          <AdminGridCard
            key={project.id}
            id={project.id}
            href={`/tarjoukset/${project.id}`}
            title={project.title}
            footer={
              <>
                <span className="font-medium">Tila:</span>{" "}
                {statusBits(project, hasBid)}
              </>
            }
            actions={
              <ContractorProjectInterestButtons
                projectId={project.id}
                currentInterest={project.interest}
                compact
                tone="onColor"
              />
            }
          >
            <p>{project.municipality}</p>
            <p>
              <span className="text-white/75">Budjetti:</span>{" "}
              {formatBudget(project.budget_min, project.budget_max)}
            </p>
            <p className="text-white/75">{label}</p>
            {showBudgetWarning && !project.meetsMinBudget && (
              <p className="font-medium text-amber-100">
                Alle minimibudjettisi
              </p>
            )}
            <ProjectMatchBadges match={project.match} className="mt-1" />
          </AdminGridCard>
        );
      })}
    </div>
  );
}
