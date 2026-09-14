import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ProjectActivityEvent, ProjectActivityKind } from "@/lib/project-activity";

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    (msg.includes("could not find") && msg.includes("column"))
  );
}

export type ProjectActivityEventType = "bid_updated" | "bid_submitted";

type StoredActivityRow = {
  id: string;
  project_id: string;
  event_type: string;
  kind: ProjectActivityKind;
  actor_id: string | null;
  reference_id: string | null;
  detail: string | null;
  created_at: string;
};

async function activityEventsClient(): Promise<SupabaseClient | null> {
  const admin = tryCreateAdminClient();
  if (admin) return admin;
  try {
    return await createClient();
  } catch {
    return null;
  }
}

export async function recordProjectActivityEvent(params: {
  projectId: string;
  eventType: ProjectActivityEventType;
  kind: ProjectActivityKind;
  actorId?: string;
  referenceId?: string;
  detail?: string;
}): Promise<void> {
  const client = await activityEventsClient();
  if (!client) {
    console.warn("[recordProjectActivityEvent] no database client");
    return;
  }

  const { error } = await client.from("project_activity_events").insert({
    project_id: params.projectId,
    event_type: params.eventType,
    kind: params.kind,
    actor_id: params.actorId ?? null,
    reference_id: params.referenceId ?? null,
    detail: params.detail ?? null,
  });

  if (error) {
    console.error(
      "[recordProjectActivityEvent]",
      params.eventType,
      error.code,
      error.message,
    );
  }
}

function companyLabel(map: Map<string, string>, contractorId: string | null): string {
  if (!contractorId) return "Urakoitsija";
  return map.get(contractorId) ?? "Urakoitsija";
}

function labelForStoredEvent(
  row: StoredActivityRow,
  companyMap: Map<string, string>,
  options: { forContractorId?: string; customerView: boolean },
): string | null {
  if (options.forContractorId && row.actor_id !== options.forContractorId) {
    return null;
  }

  const company = companyLabel(companyMap, row.actor_id);

  switch (row.event_type as ProjectActivityEventType) {
    case "bid_updated":
      return options.customerView
        ? `${company} päivitti tarjousta`
        : "Päivitit tarjousta";
    case "bid_submitted":
      return options.customerView
        ? `Tarjous saapui: ${company}`
        : "Lähetit tarjouksen";
    default:
      return null;
  }
}

export function storedRowsToActivityEvents(
  rows: StoredActivityRow[],
  companyMap: Map<string, string>,
  options: { forContractorId?: string; customerView: boolean },
): ProjectActivityEvent[] {
  const events: ProjectActivityEvent[] = [];

  for (const row of rows) {
    const label = labelForStoredEvent(row, companyMap, options);
    if (!label) continue;

    events.push({
      id: `stored-${row.id}`,
      at: row.created_at,
      label,
      detail: row.detail ?? undefined,
      kind: row.kind,
    });
  }

  return events;
}

export async function fetchStoredProjectActivityEvents(
  projectId: string,
  fallbackClient?: SupabaseClient,
): Promise<StoredActivityRow[]> {
  const admin = tryCreateAdminClient();
  const client = admin ?? fallbackClient;
  if (!client) return [];

  const { data, error } = await client
    .from("project_activity_events")
    .select(
      "id, project_id, event_type, kind, actor_id, reference_id, detail, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      console.warn("[fetchStoredProjectActivityEvents] table missing");
      return [];
    }
    console.error("[fetchStoredProjectActivityEvents]", error.code, error.message);
    return [];
  }

  return (data ?? []) as StoredActivityRow[];
}

export function storedBidUpdateReferenceIds(rows: StoredActivityRow[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.event_type === "bid_updated" && row.reference_id) {
      ids.add(row.reference_id);
    }
  }
  return ids;
}

/** Test helper: admin insert without swallowing errors. */
export function createActivityEventsAdminClient() {
  return createAdminClient();
}
