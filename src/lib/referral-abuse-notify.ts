import { createNotification } from "@/lib/notifications-server";
import { normalizeReferrerEmail } from "@/lib/contractor-referral";
import { fetchAdminUserIds } from "@/lib/billing-admin";
import { sendEmail, siteUrl } from "@/lib/email";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const REFERRALS_24H_THRESHOLD = 3;
const REFERRALS_7D_THRESHOLD = 7;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function adminNotifyEmail(): string | null {
  return (
    process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
    process.env.ADMIN_BILLING_EMAIL?.trim() ||
    process.env.BILLING_ADMIN_EMAIL?.trim() ||
    null
  );
}

async function adminAuthEmail(admin: AdminClient, adminId: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(adminId);
  const email = data.user?.email?.trim();
  return email?.includes("@") ? email : null;
}

async function countCustomerReferrerActivity(
  admin: AdminClient,
  referrerCustomerId: string,
  sinceIso: string,
): Promise<number> {
  const [customerRefs, contractorRefs] = await Promise.all([
    admin
      .from("customer_referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_customer_id", referrerCustomerId)
      .gte("created_at", sinceIso),
    admin
      .from("customer_contractor_referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_customer_id", referrerCustomerId)
      .gte("created_at", sinceIso),
  ]);

  return (customerRefs.count ?? 0) + (contractorRefs.count ?? 0);
}

async function countContractorReferrerActivity(
  admin: AdminClient,
  referrerContractorId: string,
  sinceIso: string,
): Promise<number> {
  const { count } = await admin
    .from("contractor_referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_contractor_id", referrerContractorId)
    .gte("created_at", sinceIso);

  return count ?? 0;
}

async function countReferralsByEmail(
  admin: AdminClient,
  referrerEmail: string,
  sinceIso: string,
): Promise<number> {
  const normalized = normalizeReferrerEmail(referrerEmail);
  const [a, b, c] = await Promise.all([
    admin
      .from("customer_referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_email_at_signup", normalized)
      .gte("created_at", sinceIso),
    admin
      .from("customer_contractor_referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_email_at_signup", normalized)
      .gte("created_at", sinceIso),
    admin
      .from("contractor_referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_email_at_signup", normalized)
      .gte("created_at", sinceIso),
  ]);

  return (a.count ?? 0) + (b.count ?? 0) + (c.count ?? 0);
}

/** Ilmoita admineille, jos suosittelija kerää epäilyttävän määrän uusia suositteluja. */
export async function notifySuspiciousReferralIfNeeded(
  admin: AdminClient,
  params: {
    referrerEmail: string;
    referredUserId: string;
    referrerCustomerId?: string;
    referrerContractorId?: string;
    kind: "customer" | "contractor" | "customer_contractor";
  },
): Promise<void> {
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [count24hById, count7dById, count7dByEmail] = await Promise.all([
    params.referrerCustomerId
      ? countCustomerReferrerActivity(admin, params.referrerCustomerId, since24h)
      : params.referrerContractorId
        ? countContractorReferrerActivity(admin, params.referrerContractorId, since24h)
        : Promise.resolve(0),
    params.referrerCustomerId
      ? countCustomerReferrerActivity(admin, params.referrerCustomerId, since7d)
      : params.referrerContractorId
        ? countContractorReferrerActivity(admin, params.referrerContractorId, since7d)
        : Promise.resolve(0),
    countReferralsByEmail(admin, params.referrerEmail, since7d),
  ]);

  const suspicious24h = count24hById >= REFERRALS_24H_THRESHOLD;
  const suspicious7d = count7dById >= REFERRALS_7D_THRESHOLD;
  const suspiciousEmailVolume = count7dByEmail >= REFERRALS_7D_THRESHOLD;

  if (!suspicious24h && !suspicious7d && !suspiciousEmailVolume) return;

  const kindLabel =
    params.kind === "customer"
      ? "asiakas → asiakas"
      : params.kind === "customer_contractor"
        ? "asiakas → urakoitsija"
        : "urakoitsija → urakoitsija";

  const title = "Epäilyttävä suositteluaktiviteetti";
  const body = `${normalizeReferrerEmail(params.referrerEmail)}: ${count24hById} / 24 h, ${count7dById} / 7 pv (${kindLabel})`;
  const linkPath = "/admin";

  const emailHtml = `
    <div style="font-family:system-ui,sans-serif;max-width:560px">
      <h1 style="font-size:18px">${escapeHtml(title)}</h1>
      <p>Suosittelujärjestelmä havaitsi poikkeavan määrän uusia suositteluja.</p>
      <ul style="line-height:1.6">
        <li><strong>Suosittelijan sähköposti:</strong> ${escapeHtml(params.referrerEmail)}</li>
        <li><strong>Viimeisin suosittelun kohde:</strong> ${escapeHtml(params.referredUserId)}</li>
        <li><strong>Tyyppi:</strong> ${escapeHtml(kindLabel)}</li>
        <li><strong>24 h:</strong> ${count24hById} suosittelua (raja ${REFERRALS_24H_THRESHOLD})</li>
        <li><strong>7 pv (suosittelija-ID):</strong> ${count7dById} (raja ${REFERRALS_7D_THRESHOLD})</li>
        <li><strong>7 pv (sähköposti):</strong> ${count7dByEmail} (raja ${REFERRALS_7D_THRESHOLD})</li>
      </ul>
      <p style="margin-top:24px"><a href="${siteUrl("/admin")}">Avaa hallinta</a></p>
    </div>
  `;

  const adminIds = await fetchAdminUserIds();
  const emailRecipients = new Set<string>();

  for (const adminId of adminIds) {
    await createNotification({
      userId: adminId,
      type: "referral_abuse_alert",
      title,
      body,
      linkPath,
    });
    const to = await adminAuthEmail(admin, adminId);
    if (to) emailRecipients.add(to.toLowerCase());
  }

  const fallbackTo = adminNotifyEmail();
  if (fallbackTo) emailRecipients.add(fallbackTo.toLowerCase());

  for (const to of emailRecipients) {
    void sendEmail({ to, subject: title, html: emailHtml });
  }
}
