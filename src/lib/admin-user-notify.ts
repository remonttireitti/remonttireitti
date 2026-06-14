import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications-server";
import { sendEmail, siteUrl } from "@/lib/email";
import {
  adminNewUsersGloballyDisabled,
  getNotificationPrefs,
} from "@/lib/notification-prefs";

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

async function adminAuthEmail(adminId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(adminId);
  const email = data.user?.email?.trim();
  return email?.includes("@") ? email : null;
}

function buildRegistrationEmailHtml(params: {
  title: string;
  roleLabel: string;
  who: string;
  email?: string | null;
}) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px">
      <h1 style="font-size:18px">${escapeHtml(params.title)}</h1>
      <p>Uusi rekisteröityminen palveluun.</p>
      <ul style="line-height:1.6">
        <li><strong>Rooli:</strong> ${escapeHtml(params.roleLabel)}</li>
        <li><strong>Nimi / yritys:</strong> ${escapeHtml(params.who)}</li>
        ${params.email ? `<li><strong>Sähköposti:</strong> ${escapeHtml(params.email)}</li>` : ""}
      </ul>
      <p style="margin-top:24px"><a href="${siteUrl("/admin")}">Avaa hallinta</a></p>
    </div>
  `;
}

/** Ilmoita admineille: uusi käyttäjä tai urakoitsija. */
export async function notifyAdminsNewRegistration(params: {
  userId: string;
  role: "customer" | "contractor";
  fullName?: string | null;
  companyName?: string | null;
  email?: string | null;
}): Promise<void> {
  if (adminNewUsersGloballyDisabled()) return;

  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  const roleLabel = params.role === "contractor" ? "Urakoitsija" : "Asiakas";
  const who =
    params.role === "contractor"
      ? params.companyName || params.fullName || params.email || "—"
      : params.fullName || params.email || "—";

  const title =
    params.role === "contractor" ? "Uusi urakoitsija" : "Uusi käyttäjä";
  const body = `${roleLabel}: ${who}`;
  const linkPath = "/admin";
  const emailHtml = buildRegistrationEmailHtml({
    title,
    roleLabel,
    who,
    email: params.email,
  });
  const emailSubject = `${title}: ${who}`;

  const emailRecipients = new Set<string>();

  for (const row of admins ?? []) {
    const prefs = await getNotificationPrefs(row.id);
    if (!prefs.notifyAdminNewUsers) continue;

    if (prefs.notifyInApp) {
      await createNotification({
        userId: row.id,
        type: "new_user_registered",
        title,
        body,
        linkPath,
      });
    }

    if (prefs.notifyEmail) {
      const to = await adminAuthEmail(row.id);
      if (to) emailRecipients.add(to.toLowerCase());
    }
  }

  const fallbackTo = adminNotifyEmail();
  if (fallbackTo) emailRecipients.add(fallbackTo.toLowerCase());

  for (const to of emailRecipients) {
    const result = await sendEmail({
      to,
      subject: emailSubject,
      html: emailHtml,
    });
    if (!result.ok && !result.skipped) {
      console.error(
        "[admin-user-notify] registration email failed",
        to,
        result.error,
      );
    }
  }
}
