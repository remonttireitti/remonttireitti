"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HELP_CATEGORIES, HELP_LOCATION_TYPES } from "@/lib/help-categories";
import {
  notifyHelpCompletionConfirmed,
  notifyHelpCompletionPending,
  notifyHelpOfferAccepted,
  notifyHelpOfferReceived,
  notifyNearbyHelpRequest,
} from "@/lib/help-notify";
import { scheduleNotification } from "@/lib/schedule-notification";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isContractor } from "@/lib/auth";

export type HelpActionState = { error?: string; ok?: string };

function parsePostal(raw: string): string | null {
  const p = raw.replace(/\s/g, "").slice(0, 5);
  return /^\d{5}$/.test(p) ? p : null;
}

export async function createHelpRequest(
  _prev: HelpActionState,
  formData: FormData,
): Promise<HelpActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu?redirect=/apu/uusi");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const postalCode = parsePostal(String(formData.get("postal_code") ?? ""));
  const municipality = String(formData.get("municipality") ?? "").trim();
  const locationType = String(formData.get("location_type") ?? "");
  const peopleNeeded = Number(formData.get("people_needed") ?? 1);
  const urgency = formData.get("urgency") === "now" ? "now" : "normal";
  const windowStartRaw = String(formData.get("window_start") ?? "").trim();
  const windowEndRaw = String(formData.get("window_end") ?? "").trim();

  if (title.length < 5) return { error: "Otsikko on liian lyhyt." };
  if (description.length < 10) return { error: "Kuvaile tarvetta hieman tarkemmin." };
  if (!HELP_CATEGORIES.some((c) => c.id === category)) {
    return { error: "Valitse kategoria." };
  }
  if (!postalCode) return { error: "Anna kelvollinen postinumero." };
  if (!municipality) return { error: "Anna kunta." };
  if (!HELP_LOCATION_TYPES.some((l) => l.id === locationType)) {
    return { error: "Valitse tapahtumapaikka (ulkona tai yhteinen tila)." };
  }
  if (!Number.isFinite(peopleNeeded) || peopleNeeded < 1 || peopleNeeded > 10) {
    return { error: "Henkilömäärä 1–10." };
  }

  const windowStart = windowStartRaw ? new Date(windowStartRaw).toISOString() : null;
  const windowEnd = windowEndRaw ? new Date(windowEndRaw).toISOString() : null;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("help_requests")
    .insert({
      requester_id: user.id,
      title,
      description,
      category,
      postal_code: postalCode,
      municipality,
      location_type: locationType,
      people_needed: peopleNeeded,
      urgency,
      window_start: windowStart,
      window_end: windowEnd,
      expires_at: expiresAt,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createHelpRequest]", error?.message);
    return { error: "Apupyynnön julkaisu epäonnistui." };
  }

  await supabase
    .from("profiles")
    .update({
      help_postal_code: postalCode,
      help_municipality: municipality,
    })
    .eq("id", user.id);

  scheduleNotification(() =>
    notifyNearbyHelpRequest({
      requestId: data.id,
      title,
      category,
      postalCode,
      municipality,
      urgency,
      requesterId: user.id,
    }),
  );

  revalidatePath("/apu");
  redirect(`/apu/${data.id}?julkaistu=1`);
}

export async function offerHelp(
  _prev: HelpActionState,
  formData: FormData,
): Promise<HelpActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const requestId = String(formData.get("request_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  const { data: request } = await supabase
    .from("help_requests")
    .select("id, requester_id, title, status, expires_at")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.status !== "open") {
    return { error: "Apupyyntö ei ole enää avoinna." };
  }
  if (request.requester_id === user.id) {
    return { error: "Et voi auttaa omassa pyynnössäsi." };
  }
  if (new Date(request.expires_at).getTime() < Date.now()) {
    return { error: "Apupyyntö on vanhentunut." };
  }

  const contractor = await isContractor();
  let helperKind: "individual" | "company" = "individual";
  let displayName = "Naapuri";

  const profile = await getProfile();
  if (profile?.full_name?.trim()) displayName = profile.full_name.trim();

  if (contractor) {
    const { data: cp } = await supabase
      .from("contractor_profiles")
      .select("company_name")
      .eq("id", user.id)
      .maybeSingle();
    if (cp?.company_name) {
      helperKind = "company";
      displayName = cp.company_name;
    }
  }

  const { error } = await supabase.from("help_offers").insert({
    request_id: requestId,
    helper_id: user.id,
    helper_kind: helperKind,
    helper_display_name: displayName,
    message,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return { error: "Olet jo tarjonnut apua tähän." };
    return { error: "Apua ei voitu tarjota." };
  }

  scheduleNotification(() =>
    notifyHelpOfferReceived({
      requesterId: request.requester_id,
      requestId,
      requestTitle: request.title,
      helperDisplayName: displayName,
    }),
  );

  revalidatePath(`/apu/${requestId}`);
  revalidatePath("/apu");
  return { ok: "Tarjosit apua — pyytäjä näkee sen." };
}

export async function acceptHelpOffer(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const offerId = String(formData.get("offer_id") ?? "");
  const requestId = String(formData.get("request_id") ?? "");

  const { data: request } = await supabase
    .from("help_requests")
    .select("id, requester_id, title, status")
    .eq("id", requestId)
    .single();

  if (!request || request.requester_id !== user.id || request.status !== "open") {
    redirect(`/apu/${requestId}?virhe=ei-oikeutta`);
  }

  const { data: offer } = await supabase
    .from("help_offers")
    .select("id, helper_id, status, helper_display_name")
    .eq("id", offerId)
    .eq("request_id", requestId)
    .single();

  if (!offer || offer.status !== "pending") {
    redirect(`/apu/${requestId}?virhe=tarjous`);
  }

  await supabase
    .from("help_requests")
    .update({ status: "matched", accepted_offer_id: offerId })
    .eq("id", requestId);

  await supabase
    .from("help_offers")
    .update({ status: "accepted" })
    .eq("id", offerId);

  await supabase
    .from("help_offers")
    .update({ status: "declined" })
    .eq("request_id", requestId)
    .eq("status", "pending")
    .neq("id", offerId);

  scheduleNotification(() =>
    notifyHelpOfferAccepted({
      helperId: offer.helper_id,
      requestId,
      requestTitle: request.title,
    }),
  );

  revalidatePath(`/apu/${requestId}`);
  redirect(`/apu/${requestId}?valittu=1`);
}

export async function markHelpDone(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const requestId = String(formData.get("request_id") ?? "");

  const { data: request } = await supabase
    .from("help_requests")
    .select("id, requester_id, title, status, accepted_offer_id")
    .eq("id", requestId)
    .single();

  if (!request || request.status !== "matched" || !request.accepted_offer_id) {
    redirect(`/apu/${requestId}?virhe=tila`);
  }

  const { data: offer } = await supabase
    .from("help_offers")
    .select("id, helper_id, helper_display_name, status")
    .eq("id", request.accepted_offer_id)
    .single();

  if (!offer || offer.helper_id !== user.id || offer.status !== "accepted") {
    redirect(`/apu/${requestId}?virhe=ei-auttaja`);
  }

  const { data: existing } = await supabase
    .from("help_completions")
    .select("id")
    .eq("offer_id", offer.id)
    .maybeSingle();

  if (existing) {
    redirect(`/apu/${requestId}?odottaa=1`);
  }

  await supabase.from("help_completions").insert({
    request_id: requestId,
    offer_id: offer.id,
    helper_id: user.id,
    requester_id: request.requester_id,
    status: "pending_requester",
  });

  scheduleNotification(() =>
    notifyHelpCompletionPending({
      requesterId: request.requester_id,
      requestId,
      requestTitle: request.title,
      helperDisplayName: offer.helper_display_name,
    }),
  );

  revalidatePath(`/apu/${requestId}`);
  redirect(`/apu/${requestId}?kuittaus=1`);
}

export async function confirmHelpReceived(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const completionId = String(formData.get("completion_id") ?? "");
  const confirmed = formData.get("confirmed") === "yes";

  const { data: completion } = await supabase
    .from("help_completions")
    .select("*")
    .eq("id", completionId)
    .single();

  if (
    !completion ||
    completion.requester_id !== user.id ||
    completion.status !== "pending_requester"
  ) {
    redirect("/apu/omat?virhe=kuittaus");
  }

  if (!confirmed) {
    await supabase
      .from("help_completions")
      .update({
        status: "rejected",
        requester_rejected: true,
        requester_confirmed_at: new Date().toISOString(),
      })
      .eq("id", completionId);

    await supabase
      .from("help_requests")
      .update({ status: "matched" })
      .eq("id", completion.request_id);

    revalidatePath(`/apu/${completion.request_id}`);
    redirect(`/apu/${completion.request_id}?hylatty=1`);
  }

  const now = new Date().toISOString();

  await admin
    .from("help_completions")
    .update({
      status: "confirmed",
      requester_confirmed_at: now,
    })
    .eq("id", completionId);

  await admin
    .from("help_requests")
    .update({ status: "done" })
    .eq("id", completion.request_id);

  await admin
    .from("help_offers")
    .update({ status: "completed" })
    .eq("id", completion.offer_id);

  const { data: helperProfile } = await admin
    .from("profiles")
    .select("free_helps_given")
    .eq("id", completion.helper_id)
    .single();

  const newGiven = (helperProfile?.free_helps_given ?? 0) + 1;

  await admin
    .from("profiles")
    .update({ free_helps_given: newGiven })
    .eq("id", completion.helper_id);

  const { data: requesterProfile } = await admin
    .from("profiles")
    .select("free_helps_received")
    .eq("id", completion.requester_id)
    .single();

  await admin
    .from("profiles")
    .update({
      free_helps_received: (requesterProfile?.free_helps_received ?? 0) + 1,
    })
    .eq("id", completion.requester_id);

  scheduleNotification(() =>
    notifyHelpCompletionConfirmed({
      helperId: completion.helper_id,
      requestId: completion.request_id,
      freeHelpsGiven: newGiven,
    }),
  );

  revalidatePath(`/apu/${completion.request_id}`);
  revalidatePath("/apu/omat");
  redirect(`/apu/${completion.request_id}?kiitos=1`);
}

export async function cancelHelpRequest(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const requestId = String(formData.get("request_id") ?? "");

  const { data: request } = await supabase
    .from("help_requests")
    .select("id, requester_id, status")
    .eq("id", requestId)
    .single();

  if (!request || request.requester_id !== user.id) {
    redirect("/apu?virhe=ei-oikeutta");
  }
  if (!["open", "matched"].includes(request.status)) {
    redirect(`/apu/${requestId}?virhe=tila`);
  }

  await supabase
    .from("help_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);

  revalidatePath("/apu");
  redirect("/apu/omat?peruttu=1");
}

export async function updateHelpPreferences(
  _prev: HelpActionState,
  formData: FormData,
): Promise<HelpActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const postalCode = parsePostal(String(formData.get("help_postal_code") ?? ""));
  const municipality = String(formData.get("help_municipality") ?? "").trim();
  const radius = Number(formData.get("help_radius_km") ?? 5);
  const notifyNearby = formData.get("notify_nearby_help") === "on";
  const offerVoluntary = formData.get("offer_voluntary_help") === "on";

  if (!postalCode) return { error: "Anna kelvollinen postinumero." };
  if (!municipality) return { error: "Anna kunta." };
  if (!Number.isFinite(radius) || radius < 1 || radius > 50) {
    return { error: "Säde 1–50 km." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      help_postal_code: postalCode,
      help_municipality: municipality,
      help_radius_km: Math.round(radius),
      notify_nearby_help: notifyNearby,
      offer_voluntary_help: offerVoluntary,
    })
    .eq("id", user.id);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidatePath("/apu");
  revalidatePath("/oma-tili");
  return { ok: "Apu-asetukset tallennettu." };
}
