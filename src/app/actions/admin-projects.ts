"use server";

import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { AdminState } from "@/app/actions/admin";

function revalidateProjectPaths(projectId: string) {
  revalidatePath("/admin/pyynnot");
  revalidatePath("/tarjoukset");
  revalidatePath("/oma-tili");
  revalidatePath(`/remontti/${projectId}`);
  revalidatePath(`/tarjoukset/${projectId}`);
  revalidatePath(`/tarjoukset/urakka/${projectId}`);
}

export async function cancelProject(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return { error: "Pyyntö puuttuu." };

  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, status")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Pyyntöä ei löydy." };

  if (project.status === "cancelled") {
    return { ok: "Pyyntö on jo peruttu." };
  }

  if (project.status === "completed") {
    return { error: "Valmista urakkaa ei voi perua — käytä poistoa testidatalle." };
  }

  const { error } = await admin
    .from("projects")
    .update({ status: "cancelled" })
    .eq("id", projectId);

  if (error) return { error: "Peruminen epäonnistui." };

  revalidateProjectPaths(projectId);
  return { ok: "Tarjouspyyntö merkitty perutuksi." };
}

export async function deleteProject(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return { error: "Pyyntö puuttuu." };

  const admin = createAdminClient();

  const { error } = await admin.from("projects").delete().eq("id", projectId);

  if (error) return { error: "Poisto epäonnistui: " + error.message };

  revalidateProjectPaths(projectId);
  return { ok: "Tarjouspyyntö poistettu pysyvästi." };
}
