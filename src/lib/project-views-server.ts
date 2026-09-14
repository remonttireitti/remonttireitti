import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

/** Näitä rooleja ei lasketa eikä tallenneta urakoitsijakatseluiksi. */
const UNTRACKED_VIEWER_ROLES = new Set<UserRole>(["admin"]);

async function isTrackedViewer(userId: string): Promise<boolean> {
  const admin = tryCreateAdminClient();
  if (!admin) return true;

  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!data?.role) return true;
  return !UNTRACKED_VIEWER_ROLES.has(data.role as UserRole);
}

async function filterTrackedViewerIds(viewerIds: string[]): Promise<string[]> {
  if (viewerIds.length === 0) return [];

  const admin = tryCreateAdminClient();
  if (!admin) return viewerIds;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role")
    .in("id", viewerIds);

  const roleById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.role as UserRole]),
  );

  return viewerIds.filter((id) => {
    const role = roleById.get(id);
    return role == null || !UNTRACKED_VIEWER_ROLES.has(role);
  });
}

export async function recordProjectView(
  supabase: SupabaseClient,
  projectId: string,
  contractorId: string,
): Promise<void> {
  if (!(await isTrackedViewer(contractorId))) return;

  const now = new Date().toISOString();
  const { error } = await supabase.from("project_contractor_views").upsert(
    {
      project_id: projectId,
      contractor_id: contractorId,
      last_viewed_at: now,
    },
    { onConflict: "project_id,contractor_id", ignoreDuplicates: false },
  );

  if (error) {
    const admin = tryCreateAdminClient();
    if (!admin) return;

    await admin.from("project_contractor_views").upsert(
      {
        project_id: projectId,
        contractor_id: contractorId,
        last_viewed_at: now,
      },
      { onConflict: "project_id,contractor_id" },
    );
  }
}

export async function countProjectViews(
  _supabase: SupabaseClient,
  projectId: string,
): Promise<number> {
  const admin = tryCreateAdminClient();
  if (!admin) return 0;

  const { data } = await admin
    .from("project_contractor_views")
    .select("contractor_id")
    .eq("project_id", projectId);

  const ids = (data ?? []).map((r) => r.contractor_id as string);
  const tracked = await filterTrackedViewerIds(ids);
  return tracked.length;
}

export async function fetchProjectViewContractorIds(
  projectId: string,
): Promise<string[]> {
  const admin = tryCreateAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("project_contractor_views")
    .select("contractor_id")
    .eq("project_id", projectId);

  const ids = (data ?? []).map((r) => r.contractor_id as string);
  return filterTrackedViewerIds(ids);
}
