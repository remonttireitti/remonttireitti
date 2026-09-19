import type { ProjectStatus } from "@/types/database";
import { formatBudgetWithVat } from "@/lib/vat-label";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  draft: "Luonnos",
  published: "Julkaistu",
  receiving_bids: "Tarjouksia saatu",
  bid_accepted: "Tarjous hyväksytty",
  in_progress: "Käynnissä",
  completed: "Valmis",
  cancelled: "Peruttu",
};

export function getProjectStatusLabel(
  status: ProjectStatus,
  opts?: { finalizing?: boolean },
): string {
  if (status === "bid_accepted" && opts?.finalizing) {
    return "Viimeistellään";
  }
  return projectStatusLabels[status];
}

export function formatBudget(min: number | null, max: number | null): string {
  return formatBudgetWithVat(min, max);
}
