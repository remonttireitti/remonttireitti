import { helpCategoryEmoji, helpCategoryLabel } from "@/lib/help-categories";
import { formatHelpDistance } from "@/lib/help-requests-shared";
import { postalCodeDistanceKm } from "@/lib/geo-distance";
import { createNotification } from "@/lib/notifications-server";
import { getNotificationPrefs } from "@/lib/notification-prefs";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";

async function notifyUser(
  userId: string,
  type: import("@/lib/notifications").NotificationType,
  title: string,
  body: string,
  linkPath: string,
) {
  const prefs = await getNotificationPrefs(userId);
  if (prefs.notifyInApp) {
    await createNotification({ userId, type, title, body, linkPath });
  }
  if (prefs.notifyEmail) {
    const admin = tryCreateAdminClient();
    if (!admin) return;
    const { data } = await admin.auth.admin.getUserById(userId);
    const to = data.user?.email;
    if (!to) return;
    await sendEmail({
      to,
      subject: title,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px">
        <p style="font-size:12px;font-weight:600;color:#0369a1">Remonttireitti – Apu</p>
        <h1 style="font-size:18px">${title}</h1>
        <p>${body}</p>
        <p><a href="${siteUrl(linkPath)}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Avaa</a></p>
      </div>`,
    });
  }
}

export async function notifyNearbyHelpRequest(params: {
  requestId: string;
  title: string;
  category: string;
  postalCode: string;
  municipality: string;
  urgency: "normal" | "now";
  requesterId: string;
}) {
  const admin = tryCreateAdminClient();
  if (!admin) return;

  const { data: helpers } = await admin
    .from("profiles")
    .select("id, help_postal_code, help_radius_km")
    .eq("notify_nearby_help", true)
    .not("help_postal_code", "is", null)
    .neq("id", params.requesterId);

  if (!helpers?.length) return;

  const emoji = helpCategoryEmoji(params.category);
  const category = helpCategoryLabel(params.category);
  const urgent = params.urgency === "now";

  await Promise.all(
    helpers.map(async (h) => {
      const dist = await postalCodeDistanceKm(
        admin,
        h.help_postal_code!,
        params.postalCode,
      );
      const maxKm = h.help_radius_km ?? 5;
      if (dist == null || dist > maxKm) return;

      const distLabel = formatHelpDistance(dist);
      const title = urgent
        ? `${emoji} Apua tarvitaan nyt lähelläsi`
        : `${emoji} Naapurustossasi tarvitaan apua`;
      const body = `${params.title} (${category}) — ${distLabel} päässä, ${params.municipality}. Vapaaehtoista apua, ei palkkiota.`;

      await notifyUser(h.id, "nearby_help_request", title, body, `/apu/${params.requestId}`);
    }),
  );
}

export async function notifyHelpOfferReceived(params: {
  requesterId: string;
  requestId: string;
  requestTitle: string;
  helperDisplayName: string;
}) {
  await notifyUser(
    params.requesterId,
    "help_offer_received",
    "Joku voi auttaa",
    `${params.helperDisplayName} tarjoaa apua: ${params.requestTitle}`,
    `/apu/${params.requestId}`,
  );
}

export async function notifyHelpOfferAccepted(params: {
  helperId: string;
  requestId: string;
  requestTitle: string;
}) {
  await notifyUser(
    params.helperId,
    "help_offer_accepted",
    "Valittu auttajaksi",
    `Pyytäjä valitsi sinut auttajaksi: ${params.requestTitle}. Sovi yhteinen aika viestillä.`,
    `/apu/${params.requestId}`,
  );
}

export async function notifyHelpCompletionPending(params: {
  requesterId: string;
  requestId: string;
  requestTitle: string;
  helperDisplayName: string;
}) {
  await notifyUser(
    params.requesterId,
    "help_completion_pending",
    "Vahvista saatu apu",
    `${params.helperDisplayName} merkitsi auttaneensa: ${params.requestTitle}. Vahvista, että sait apua — vasta sitten apu lasketaan.`,
    `/apu/${params.requestId}`,
  );
}

export async function notifyHelpCompletionConfirmed(params: {
  helperId: string;
  requestId: string;
  freeHelpsGiven: number;
}) {
  const title =
    params.freeHelpsGiven === 1
      ? "Kiitos auttamisesta!"
      : `Olet auttanut ${params.freeHelpsGiven} kertaa ilmaiseksi`;
  await notifyUser(
    params.helperId,
    "help_completion_confirmed",
    title,
    "Pyytäjä vahvisti apusi. Hyvä teko synnyttää hyvää — kiitos kun autoit muita.",
    `/apu/omat`,
  );
}
