"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PlatformFeedbackActionState = {
  error?: string;
  success?: string;
};

function parseRating(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export async function submitPlatformFeedback(
  _prev: PlatformFeedbackActionState,
  formData: FormData,
): Promise<PlatformFeedbackActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const profile = await getProfile();
  if (!profile || (profile.role !== "customer" && profile.role !== "contractor")) {
    return { error: "Palautetta voi antaa asiakkaana tai urakoitsijana." };
  }

  const role = profile.role;
  const clarityRating = parseRating(formData.get("clarity_rating"));
  const experienceRating = parseRating(formData.get("experience_rating"));
  const wouldRecommend = formData.get("would_recommend") === "yes";
  const suggestions = String(formData.get("suggestions") ?? "").trim() || null;
  const projectIdRaw = String(formData.get("project_id") ?? "").trim();
  const projectId = projectIdRaw || null;
  const context = projectId ? "project_complete" : "general";

  if (!clarityRating || !experienceRating) {
    return { error: "Anna arvosana 1–5 tähteä molemmissa kysymyksissä." };
  }

  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id, customer_id, status, accepted_bid_id")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) return { error: "Urakkaa ei löydy." };
    if (project.status !== "completed") {
      return { error: "Palaute urakasta on mahdollinen vain valmiille urakalle." };
    }

    if (role === "customer") {
      if (project.customer_id !== user.id) {
        return { error: "Ei oikeutta tähän urakkaan." };
      }
    } else {
      const { data: bid } = await supabase
        .from("bids")
        .select("id, status")
        .eq("project_id", projectId)
        .eq("contractor_id", user.id)
        .maybeSingle();

      if (!bid || bid.status !== "accepted") {
        return { error: "Ei oikeutta tähän urakkaan." };
      }
    }
  }

  const { error } = await supabase.from("platform_feedback").insert({
    user_id: user.id,
    role,
    context,
    project_id: projectId,
    clarity_rating: clarityRating,
    experience_rating: experienceRating,
    would_recommend: wouldRecommend,
    suggestions,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Olet jo antanut palautteen tästä urakasta." };
    }
    return { error: "Palautteen tallennus epäonnistui." };
  }

  revalidatePath("/oma-tili/palaute");
  revalidatePath("/oma-tili");
  if (projectId) {
    revalidatePath(
      role === "customer"
        ? `/remontti/${projectId}`
        : `/tarjoukset/urakka/${projectId}`,
    );
  }
  revalidatePath("/admin/palaute");

  return {
    success: projectId
      ? "Kiitos palautteesta! Se auttaa meitä kehittämään palvelua."
      : "Kiitos palautteesta!",
  };
}
