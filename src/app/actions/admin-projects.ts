"use server";

import { requireAdmin } from "@/lib/admin";
import { fetchEligibleContractorsForProject } from "@/lib/admin-projects-server";
import { notifyContractorsBidReminder } from "@/lib/contractor-project-notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { AdminState } from "@/app/actions/admin";

function revalidateProjectPaths(projectId: string) {
  revalidatePath("/admin/pyynnot");
  revalidatePath("/admin");
  revalidatePath(`/admin/pyynnot/${projectId}`);
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

export async function remindContractorsAboutProject(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const projectId = String(formData.get("project_id") ?? "");
  const contractorIds = formData
    .getAll("contractor_id")
    .map((v) => String(v))
    .filter(Boolean);

  if (!projectId) return { error: "Pyyntö puuttuu." };
  if (contractorIds.length === 0) {
    return { error: "Valitse vähintään yksi urakoitsija." };
  }

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, title, status, municipality, postal_code")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Pyyntöä ei löydy." };

  if (!["published", "receiving_bids"].includes(project.status as string)) {
    return {
      error: "Muistutuksia voi lähettää vain avoimiin tarjouspyyntöihin.",
    };
  }

  const eligible = await fetchEligibleContractorsForProject(projectId);
  const allowed = new Set(
    eligible.contractors.filter((c) => !c.hasActiveBid).map((c) => c.id),
  );
  const toNotify = contractorIds.filter((id) => allowed.has(id));

  if (toNotify.length === 0) {
    return {
      error: "Valitut urakoitsijat eivät ole kelvollisia tai heillä on jo tarjous.",
    };
  }

  const { sent, skipped } = await notifyContractorsBidReminder({
    projectId,
    projectTitle: project.title as string,
    municipality: project.municipality as string,
    postalCode: project.postal_code as string,
    contractorIds: toNotify,
  });

  revalidateProjectPaths(projectId);

  if (sent === 0) {
    return {
      error:
        "Kukaan valituista ei saanut ilmoitusta (sähköposti/sovellus pois päältä).",
    };
  }

  const extra =
    skipped > 0 ? ` ${skipped} ohitettiin (ilmoitukset pois päältä).` : "";
  return {
    ok: `Muistutus lähetetty ${sent} urakoitsijalle.${extra}`,
  };
}
