"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminLearningState = { error?: string; ok?: string };

export async function setLearnedProposalStatus(
  _prev: AdminLearningState,
  formData: FormData,
): Promise<AdminLearningState> {
  await requireAdmin();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const jobSlug = String(formData.get("job_slug") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const proposalSlug = String(formData.get("proposal_slug") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("admin_note") ?? "").trim();

  if (!jobSlug || !kind || !proposalSlug) {
    return { error: "Puuttuvat tunnisteet." };
  }
  if (!["pending", "approved", "dismissed"].includes(status)) {
    return { error: "Virheellinen tila." };
  }

  const { error } = await supabase.rpc("set_learned_proposal_status", {
    p_job_slug: jobSlug,
    p_kind: kind,
    p_proposal_slug: proposalSlug,
    p_status: status,
    p_note: note || null,
  });

  if (error) {
    const msg = error.message.includes("set_learned_proposal_status")
      ? "Aja Supabase-migraatio 20260919130000_learning_admin_deviations.sql"
      : error.message;
    return { error: msg };
  }

  revalidatePath("/admin/oppiminen");
  revalidatePath("/remontti/uusi");
  return { ok: "Tila päivitetty." };
}
