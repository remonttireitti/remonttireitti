"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type LifecycleActionState = { error?: string; success?: string };

export async function markProjectInProgress(
  _prev: LifecycleActionState,
  formData: FormData,
): Promise<LifecycleActionState> {
  return updateProjectStatus(formData, "in_progress", ["bid_accepted"]);
}

export async function completeProject(
  _prev: LifecycleActionState,
  formData: FormData,
): Promise<LifecycleActionState> {
  const notes = String(formData.get("completion_notes") ?? "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return { error: "Puuttuva kohde." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, customer_id, status")
    .eq("id", projectId)
    .single();

  if (!project || project.customer_id !== user.id) {
    return { error: "Ei oikeutta." };
  }

  if (!["bid_accepted", "in_progress"].includes(project.status)) {
    return { error: "Urakkaa ei voi merkitä valmiiksi tässä tilassa." };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completion_notes: notes || null,
    })
    .eq("id", projectId);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidatePath(`/remontti/${projectId}`);
  revalidatePath("/oma-tili");
  return {
    success:
      "Urakka merkitty valmiiksi. Voit arvostella urakoitsijan heti — muistutus tulee myös noin kahden viikon kuluttua, jos et ehdi.",
  };
}

export async function submitReview(
  _prev: LifecycleActionState,
  formData: FormData,
): Promise<LifecycleActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const projectId = String(formData.get("project_id") ?? "");
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();
  const wouldRecommend = formData.get("would_recommend") === "yes";

  if (!projectId || rating < 1 || rating > 5) {
    return { error: "Anna arvosana 1–5 tähteä." };
  }
  if (body.length < 10) {
    return { error: "Kirjoita lyhyt kommentti (vähintään 10 merkkiä)." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, customer_id, status")
    .eq("id", projectId)
    .single();

  if (!project || project.customer_id !== user.id) {
    return { error: "Ei oikeutta." };
  }
  if (project.status !== "completed") {
    return { error: "Arvostelu on mahdollinen vain valmiille urakalle." };
  }

  const { data: acceptedBid } = await supabase
    .from("bids")
    .select("contractor_id")
    .eq("project_id", projectId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!acceptedBid) {
    return { error: "Hyväksyttyä tarjousta ei löydy." };
  }

  const { error } = await supabase.from("reviews").insert({
    project_id: projectId,
    contractor_id: acceptedBid.contractor_id,
    customer_id: user.id,
    rating,
    body,
    would_recommend: wouldRecommend,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Olet jo arvostellut tämän urakan." };
    }
    return { error: "Arvostelun tallennus epäonnistui." };
  }

  revalidatePath(`/remontti/${projectId}`);
  revalidatePath("/oma-tili");
  return { success: "Kiitos arvostelusta!" };
}

async function updateProjectStatus(
  formData: FormData,
  targetStatus: string,
  allowedFrom: string[],
): Promise<LifecycleActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const projectId = String(formData.get("project_id") ?? "");
  const { data: project } = await supabase
    .from("projects")
    .select("id, customer_id, status")
    .eq("id", projectId)
    .single();

  if (!project || project.customer_id !== user.id) {
    return { error: "Ei oikeutta." };
  }
  if (!allowedFrom.includes(project.status)) {
    return { error: "Tilaa ei voi muuttaa." };
  }

  const { error } = await supabase
    .from("projects")
    .update({ status: targetStatus })
    .eq("id", projectId);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidatePath(`/remontti/${projectId}`);
  return { success: "Tila päivitetty." };
}
