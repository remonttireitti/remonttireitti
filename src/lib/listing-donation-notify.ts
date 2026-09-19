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
        <p style="font-size:12px;font-weight:600;color:#0369a1">Remonttireitti – Tori</p>
        <h1 style="font-size:18px">${title}</h1>
        <p>${body}</p>
        <p><a href="${siteUrl(linkPath)}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Avaa</a></p>
      </div>`,
    });
  }
}

export async function notifyDonationRecipientSelected(params: {
  recipientId: string;
  listingId: string;
  listingTitle: string;
}) {
  await notifyUser(
    params.recipientId,
    "listing_donation_selected",
    "Sinut valittiin lahjoituksen saajaksi",
    `Myyjä valitsi sinut noutajaksi: ${params.listingTitle}. Sovi nouto viestillä.`,
    `/markkinapaikka/ilmoitukset/${params.listingId}`,
  );
}

export async function notifyDonationConfirmPending(params: {
  recipientId: string;
  listingId: string;
  listingTitle: string;
}) {
  await notifyUser(
    params.recipientId,
    "listing_donation_confirm",
    "Vahvista lahjoituksen nouto",
    `Myyjä merkitsi tavaran luovutetuksi: ${params.listingTitle}. Vahvista, että sait tavaran.`,
    `/markkinapaikka/ilmoitukset/${params.listingId}`,
  );
}

export async function notifyDonationConfirmed(params: {
  sellerId: string;
  listingId: string;
  freeDonationsGiven: number;
}) {
  const title =
    params.freeDonationsGiven === 1
      ? "Kiitos lahjoituksesta!"
      : `Olet lahjoittanut ${params.freeDonationsGiven} kertaa ilmaiseksi`;
  await notifyUser(
    params.sellerId,
    "listing_donation_confirmed",
    title,
    "Saaja vahvisti noudon. Hyvä teko synnyttää hyvää — kiitos kun jaat ylijäämää yhteisölle.",
    `/markkinapaikka/omat-ilmoitukset`,
  );
}
