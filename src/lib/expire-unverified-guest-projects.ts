import { createAdminClient } from "@/lib/supabase/admin";
import { isUnverifiedGuestProjectExpired } from "@/lib/guest-project-verification";
import { deleteProjectStoragePhotos } from "@/lib/project-photos";

type GuestProjectRow = {
  id: string;
  created_at: string;
  email_verified_at: string | null;
  status: string;
  customer_id: string | null;
};

export async function deleteUnverifiedGuestProject(
  projectId: string,
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, created_at, email_verified_at, status, customer_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return false;
  if (project.customer_id != null) return false;
  if (project.status !== "draft") return false;
  if (project.email_verified_at) return false;
  if (!isUnverifiedGuestProjectExpired(project)) return false;

  await deleteProjectStoragePhotos(projectId);

  const { error } = await admin.from("projects").delete().eq("id", projectId);
  if (error) {
    console.error("[deleteUnverifiedGuestProject]", projectId, error.message);
    return false;
  }

  return true;
}

export async function expireUnverifiedGuestProjectIfNeeded(
  projectId: string,
): Promise<"deleted" | "active" | "skipped"> {
  const deleted = await deleteUnverifiedGuestProject(projectId);
  return deleted ? "deleted" : "skipped";
}

/** Poistaa vahvistamattomat vieraspyynnöt, joiden luonti on yli 24 h sitten. */
export async function expireAllUnverifiedGuestProjects(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await admin
    .from("projects")
    .select("id, created_at, email_verified_at, status, customer_id")
    .is("customer_id", null)
    .is("email_verified_at", null)
    .eq("status", "draft")
    .lt("created_at", cutoff);

  if (error) {
    console.error("[expireAllUnverifiedGuestProjects]", error.message);
    return 0;
  }

  let deleted = 0;
  for (const row of (rows ?? []) as GuestProjectRow[]) {
    if (!isUnverifiedGuestProjectExpired(row)) continue;
    const ok = await deleteUnverifiedGuestProject(row.id);
    if (ok) deleted += 1;
  }

  return deleted;
}
