"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import {
  sendFeedbackSupportToAdmin,
  sendFeedbackVerificationEmail,
} from "@/lib/feedback-verification-email";
import {
  generateFeedbackVerificationToken,
  isValidFeedbackEmail,
  normalizeFeedbackEmail,
} from "@/lib/platform-feedback-access";
import { parseGuestUsageContext } from "@/lib/platform-feedback-labels";
import {
  fetchGeneralPlatformFeedbackForEmail,
  fetchGeneralPlatformFeedbackForUser,
} from "@/lib/platform-feedback-server";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export type PlatformFeedbackActionState = {
  error?: string;
  success?: string;
  pendingVerification?: boolean;
};

export type PlatformFeedbackSupportActionState = {
  error?: string;
  success?: string;
};

function parseRating(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

function parseRole(value: FormDataEntryValue | null): "customer" | "contractor" | null {
  const role = String(value ?? "").trim();
  if (role === "customer" || role === "contractor") return role;
  return null;
}

export async function submitPlatformFeedback(
  _prev: PlatformFeedbackActionState,
  formData: FormData,
): Promise<PlatformFeedbackActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = parseRole(formData.get("feedback_role"));
  const clarityRating = parseRating(formData.get("clarity_rating"));
  const experienceRating = parseRating(formData.get("experience_rating"));
  const wouldRecommend = formData.get("would_recommend") === "yes";
  const suggestions = String(formData.get("suggestions") ?? "").trim() || null;
  const projectIdRaw = String(formData.get("project_id") ?? "").trim();
  const projectId = projectIdRaw || null;
  const context = projectId ? "project_complete" : "general";
  const guestEmailRaw = String(formData.get("guest_email") ?? "").trim();
  const guestUsageContext = parseGuestUsageContext(formData.get("guest_usage_context"));

  if (!role) {
    return { error: "Valitse, annatko palautteen asiakkaan vai urakoitsijan näkökulmasta." };
  }

  if (!clarityRating || !experienceRating) {
    return { error: "Anna arvosana 1–5 tähteä molemmissa kysymyksissä." };
  }

  if (!user && !projectId) {
    if (!guestUsageContext) {
      return {
        error: "Kerro, oletko käyttänyt palvelua vai vain selannut sivustoa.",
      };
    }
    if (!guestEmailRaw) {
      return { error: "Anna sähköpostiosoite tai kirjaudu sisään." };
    }
    if (!isValidFeedbackEmail(guestEmailRaw)) {
      return { error: "Anna kelvollinen sähköpostiosoite." };
    }

    const existingGuest = await fetchGeneralPlatformFeedbackForEmail(guestEmailRaw);
    if (existingGuest) {
      return {
        error:
          "Tällä sähköpostilla on jo annettu palaute. Voit sen jälkeen lähettää vain tukipyynnön.",
      };
    }
  }

  if (user && !projectId) {
    const existingUser = await fetchGeneralPlatformFeedbackForUser(supabase, user.id);
    if (existingUser) {
      return {
        error:
          "Olet jo antanut yleispalautteen. Voit sen jälkeen lähettää vain tukipyynnön ylläpidolle.",
      };
    }
  }

  if (projectId) {
    if (!user) return { error: "Kirjaudu sisään." };

    const profile = await getProfile();
    if (!profile || (profile.role !== "customer" && profile.role !== "contractor")) {
      return { error: "Palautetta voi antaa asiakkaana tai urakoitsijana." };
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, customer_id, status, accepted_bid_id")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) return { error: "Urakkaa ei löydy." };
    if (project.status !== "completed") {
      return { error: "Palaute urakasta on mahdollinen vain valmiille urakalle." };
    }

    if (profile.role === "customer") {
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

  const insertPayload: Record<string, unknown> = {
    role,
    context,
    project_id: projectId,
    clarity_rating: clarityRating,
    experience_rating: experienceRating,
    would_recommend: wouldRecommend,
    suggestions,
  };

  if (user) {
    insertPayload.user_id = user.id;
    insertPayload.email_verified_at = new Date().toISOString();
  } else {
    const guestEmail = normalizeFeedbackEmail(guestEmailRaw);
    const { raw, hash } = generateFeedbackVerificationToken();
    insertPayload.guest_email = guestEmail;
    insertPayload.guest_usage_context = guestUsageContext;
    insertPayload.verification_token_hash = hash;

    const admin = tryCreateAdminClient();
    if (!admin) {
      return { error: "Palautteen tallennus ei onnistu juuri nyt. Yritä myöhemmin." };
    }

    const { data: inserted, error } = await admin
      .from("platform_feedback")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          error:
            "Tällä sähköpostilla on jo annettu palaute. Voit lähettää tukipyynnön olemassa olevan palautteen yhteydessä.",
        };
      }
      return { error: "Palautteen tallennus epäonnistui." };
    }

    const emailResult = await sendFeedbackVerificationEmail({
      to: guestEmail,
      feedbackId: inserted.id,
      rawToken: raw,
    });

    if (!emailResult.ok && !emailResult.skipped) {
      return { error: "Palautteen tallennus onnistui, mutta vahvistusviestin lähetys epäonnistui." };
    }

    revalidatePublicFeedbackPaths();
    return {
      success:
        "Kiitos! Tarkista sähköpostisi ja vahvista palaute — se lasketaan mukaan tilastoihin vasta vahvistuksen jälkeen.",
      pendingVerification: true,
    };
  }

  const { error } = await supabase.from("platform_feedback").insert(insertPayload);

  if (error) {
    if (error.code === "23505") {
      return {
        error: projectId
          ? "Olet jo antanut palautteen tästä urakasta."
          : "Olet jo antanut yleispalautteen.",
      };
    }
    return { error: "Palautteen tallennus epäonnistui." };
  }

  revalidatePublicFeedbackPaths(projectId, role);
  return {
    success: projectId
      ? "Kiitos palautteesta! Se auttaa meitä kehittämään palvelua."
      : "Kiitos palautteesta! Arviosi on nyt mukana tilastoissa.",
  };
}

export async function submitPlatformFeedbackSupport(
  _prev: PlatformFeedbackSupportActionState,
  formData: FormData,
): Promise<PlatformFeedbackSupportActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const feedbackId = String(formData.get("feedback_id") ?? "").trim();
  const guestEmailRaw = String(formData.get("guest_email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!feedbackId) return { error: "Palautetta ei löydy." };
  if (!message || message.length < 10) {
    return { error: "Kirjoita vähintään 10 merkin mittainen viesti." };
  }

  const admin = tryCreateAdminClient();
  if (!admin) return { error: "Lähetys ei onnistu juuri nyt." };

  const { data: feedback } = await admin
    .from("platform_feedback")
    .select("id, user_id, guest_email, email_verified_at")
    .eq("id", feedbackId)
    .eq("context", "general")
    .maybeSingle();

  if (!feedback) return { error: "Palautetta ei löydy." };

  if (user) {
    if (feedback.user_id !== user.id) {
      return { error: "Ei oikeutta tähän palautteeseen." };
    }
  } else {
    if (!guestEmailRaw || !isValidFeedbackEmail(guestEmailRaw)) {
      return { error: "Anna sama sähköposti, jolla annoit palautteen." };
    }
    if (
      !feedback.guest_email ||
      normalizeFeedbackEmail(feedback.guest_email) !== normalizeFeedbackEmail(guestEmailRaw)
    ) {
      return { error: "Sähköposti ei täsmää aiempaan palautteeseen." };
    }
  }

  const profile = user ? await getProfile() : null;

  const { error } = await admin.from("platform_feedback_support_requests").insert({
    feedback_id: feedbackId,
    user_id: user?.id ?? null,
    guest_email: user ? null : normalizeFeedbackEmail(guestEmailRaw),
    message,
  });

  if (error) return { error: "Tukipyynnön lähetys epäonnistui." };

  const fromEmail =
    user?.email ??
    feedback.guest_email ??
    guestEmailRaw;

  await sendFeedbackSupportToAdmin({
    feedbackId,
    fromEmail,
    fromName: profile?.full_name,
    message,
  });

  revalidatePath("/admin/palaute");
  return { success: "Kiitos! Viestisi on välitetty ylläpidolle." };
}

function revalidatePublicFeedbackPaths(
  projectId?: string | null,
  role?: "customer" | "contractor",
) {
  revalidatePath("/palaute");
  revalidatePath("/oma-tili/palaute");
  revalidatePath("/oma-tili");
  revalidatePath("/");
  revalidatePath("/admin/palaute");

  if (projectId && role) {
    revalidatePath(
      role === "customer"
        ? `/remontti/${projectId}`
        : `/tarjoukset/urakka/${projectId}`,
    );
  }
}

export async function verifyPlatformFeedback(
  feedbackId: string,
  rawToken: string,
): Promise<{ error?: string }> {
  const admin = tryCreateAdminClient();
  if (!admin) return { error: "Vahvistus ei onnistu." };

  const { hashFeedbackVerificationToken } = await import(
    "@/lib/platform-feedback-access"
  );
  const hash = hashFeedbackVerificationToken(rawToken);

  const { data: feedback } = await admin
    .from("platform_feedback")
    .select("id, email_verified_at, created_at")
    .eq("id", feedbackId)
    .eq("verification_token_hash", hash)
    .maybeSingle();

  if (!feedback) return { error: "Linkki on virheellinen tai vanhentunut." };
  if (feedback.email_verified_at) return {};

  const createdAt = new Date(feedback.created_at).getTime();
  if (Date.now() - createdAt > 24 * 60 * 60 * 1000) {
    return { error: "Vahvistuslinkki on vanhentunut. Anna palaute uudelleen." };
  }

  const { error } = await admin
    .from("platform_feedback")
    .update({
      email_verified_at: new Date().toISOString(),
      verification_token_hash: null,
    })
    .eq("id", feedbackId)
    .eq("verification_token_hash", hash);

  if (error) return { error: "Vahvistus epäonnistui." };

  revalidatePublicFeedbackPaths();
  return {};
}
