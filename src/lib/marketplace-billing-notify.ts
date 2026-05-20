import { createNotification } from "@/lib/notifications-server";
import { sendEmail, siteUrl } from "@/lib/email";
import { getNotificationPrefs } from "@/lib/notification-prefs";
import { createAdminClient } from "@/lib/supabase/admin";

async function sellerEmail(sellerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(sellerId);
  return data.user?.email ?? null;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Poista ilmoitukset, jotka viittaavat tähän toripyyntöön / ilmoitukseen. */
export async function purgeMarketplaceBillingNotifications(params: {
  sellerId: string;
  listingId: string | null;
  descriptionFi: string;
}): Promise<void> {
  const admin = createAdminClient();

  if (params.listingId) {
    await admin
      .from("notifications")
      .delete()
      .eq("user_id", params.sellerId)
      .like("link_path", `%${params.listingId}%`);
  }

  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  const snippet = params.descriptionFi.slice(0, 80);
  for (const adminRow of admins ?? []) {
    await admin
      .from("notifications")
      .delete()
      .eq("user_id", adminRow.id)
      .eq("type", "billing_pending")
      .ilike("body", `%${snippet}%`);
  }
}

/** Ilmoita myyjälle (urakoitsija/kuluttaja), että tori-pyyntö hylättiin ja poistettiin. */
export async function notifySellerMarketplaceBillingRejected(params: {
  sellerId: string;
  descriptionFi: string;
  reason: string | null;
  kind: string;
}): Promise<void> {
  const title = "Tori-pyyntö hylätty";
  const reasonLine = params.reason
    ? ` Syy: ${params.reason}`
    : "";
  const body = `${params.descriptionFi} on poistettu eikä sitä laskuteta.${reasonLine}`;
  const linkPath = "/markkinapaikka/omat-ilmoitukset";

  const prefs = await getNotificationPrefs(params.sellerId);
  if (prefs.notifyInApp) {
    await createNotification({
      userId: params.sellerId,
      type: "marketplace_billing_rejected",
      title,
      body,
      linkPath,
    });
  }

  if (!prefs.notifyEmail) return;
  const to = await sellerEmail(params.sellerId);
  if (!to) return;

  const kindLabel =
    params.kind === "subscription"
      ? "tilauspyyntö"
      : params.kind === "listing_renewal"
        ? "ilmoituksen uusiminen"
        : "ilmoituspyyntö";

  await sendEmail({
    to,
    subject: `Tori: ${title}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#1c1917">
        <h1 style="font-size:18px">${escapeHtml(title)}</h1>
        <p>Hei,</p>
        <p>Torin <strong>${escapeHtml(kindLabel)}</strong> on hylätty ja poistettu järjestelmästä. Ilmoitusta ei julkaista eikä laskua lähetetä.</p>
        <p><strong>Pyyntö:</strong> ${escapeHtml(params.descriptionFi)}</p>
        ${params.reason ? `<p><strong>Huomautus:</strong> ${escapeHtml(params.reason)}</p>` : ""}
        <p style="margin-top:24px">
          <a href="${siteUrl(linkPath)}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Omat ilmoitukset</a>
        </p>
      </div>
    `,
  });
}
