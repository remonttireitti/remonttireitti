export type ProjectActivityKind = "customer" | "contractor" | "system";

export type ProjectActivityEvent = {
  id: string;
  at: string;
  label: string;
  detail?: string;
  kind: ProjectActivityKind;
};

export function formatActivityWhen(iso: string): string {
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sortActivityEvents(events: ProjectActivityEvent[]): ProjectActivityEvent[] {
  return [...events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}
