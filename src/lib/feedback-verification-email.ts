import { sendEmail, siteUrl } from "@/lib/email";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendFeedbackVerificationEmail(params: {
  to: string;
  feedbackId: string;
  rawToken: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const verifyUrl = siteUrl(
    `/auth/vahvista-palaute?feedback=${params.feedbackId}&token=${encodeURIComponent(params.rawToken)}`,
  );

  return sendEmail({
    to: params.to,
    subject: "Vahvista palautteesi — Remonttireitti",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#1c1917">
        <p style="font-size:12px;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:.05em">Remonttireitti</p>
        <h1 style="font-size:18px;margin:16px 0 8px">Vahvista palautteesi</h1>
        <p>Kiitos palautteesta! Vahvista sähköpostiosoitteesi, jotta arviosi voidaan laskea mukaan palvelun kehitykseen.</p>
        <p style="margin:24px 0 0">
          <a href="${verifyUrl}" style="display:inline-block;background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Vahvista palaute</a>
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#78716c">Linkki on voimassa 24 tuntia. Jos et antanut palautetta, voit jättää viestin huomiotta.</p>
      </div>
    `,
  });
}

export async function sendFeedbackSupportToAdmin(params: {
  feedbackId: string;
  fromEmail: string;
  fromName?: string | null;
  message: string;
}): Promise<void> {
  const adminEmail =
    process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_COMPANY_EMAIL?.trim();

  if (!adminEmail) return;

  const subject = "Palautteen jälkeinen tukipyyntö — Remonttireitti";
  const body = `
    <p><strong>Lähettäjä:</strong> ${escapeHtml(params.fromName?.trim() || "—")} (${escapeHtml(params.fromEmail)})</p>
    <p><strong>Palaute-ID:</strong> ${escapeHtml(params.feedbackId)}</p>
    <p><strong>Viesti:</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(params.message)}</p>
  `;

  await sendEmail({
    to: adminEmail,
    subject,
    html: body,
  });
}
