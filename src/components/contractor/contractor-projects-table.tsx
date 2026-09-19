import Link from "next/link";
import { ProjectMatchBadges } from "@/components/contractor/contractor-service-area-form";
import { ContractorProjectInterestButtons } from "@/components/contractor/contractor-project-interest-buttons";
import {
  DataTable,
  DataTableBody,
  DataTableHeader,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
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

function ContractorProjectTableRow({
  project,
  hasBid,
  showBudgetWarning,
}: {
  project: ContractorProjectTableItem;
  hasBid: boolean;
  showBudgetWarning: boolean;
}) {
  const label = project.job_type_name ?? project.category_name;

  return (
    <DataTableRow>
      <DataTableTd className="min-w-[12rem]">
        <Link
          href={`/tarjoukset/${project.id}`}
          className="font-medium text-stone-900 hover:text-sky-900 hover:underline"
        >
          {project.title}
        </Link>
        <p className="mt-0.5 text-xs text-stone-500">{label}</p>
        {showBudgetWarning && !project.meetsMinBudget && (
          <p className="mt-1 text-xs font-medium text-amber-800">
            Alle minimibudjettisi
          </p>
        )}
      </DataTableTd>
      <DataTableTd className="whitespace-nowrap text-stone-700">
        {project.municipality}
      </DataTableTd>
      <DataTableTd className="whitespace-nowrap text-stone-700">
        {formatBudget(project.budget_min, project.budget_max)}
      </DataTableTd>
      <DataTableTd>
        <div className="flex flex-wrap items-center gap-1.5">
          {hasBid && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
              Tarjous jätetty
            </span>
          )}
          {project.interest === "interested" && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
              Kiinnostaa
            </span>
          )}
          {project.interest === "not_interested" && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
              Ei kiinnosta
            </span>
          )}
          <ProjectMatchBadges match={project.match} className="mt-0" />
        </div>
      </DataTableTd>
      <DataTableTd className="whitespace-nowrap">
        <ContractorProjectInterestButtons
          projectId={project.id}
          currentInterest={project.interest}
          compact
        />
      </DataTableTd>
    </DataTableRow>
  );
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
    <DataTable minWidthClassName="min-w-[720px]" className={className}>
      <DataTableHeader>
        <DataTableTh>Tarjouspyyntö</DataTableTh>
        <DataTableTh>Sijainti</DataTableTh>
        <DataTableTh>Budjetti</DataTableTh>
        <DataTableTh>Tila</DataTableTh>
        <DataTableTh>Toiminnot</DataTableTh>
      </DataTableHeader>
      <DataTableBody>
        {projects.map((project) => (
          <ContractorProjectTableRow
            key={project.id}
            project={project}
            hasBid={bidProjectIds.has(project.id)}
            showBudgetWarning={showBudgetWarning}
          />
        ))}
      </DataTableBody>
    </DataTable>
  );
}
