import type { ProjectStatus } from "@/types/database";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  draft: "Luonnos",
  published: "Julkaistu",
  receiving_bids: "Tarjouksia tulossa",
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
  if (min == null && max == null) return "Ei ilmoitettu";
  if (min != null && max != null) {
    return `${min.toLocaleString("fi-FI")} – ${max.toLocaleString("fi-FI")} €`;
  }
  if (max != null) return `Enintään ${max.toLocaleString("fi-FI")} €`;
  return `Vähintään ${min!.toLocaleString("fi-FI")} €`;
}
