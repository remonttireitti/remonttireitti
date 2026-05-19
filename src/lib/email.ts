const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Remonttireitti <noreply@remonttireitti.fi>";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(
  params: SendEmailParams,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!params.to?.includes("@")) {
    return { ok: false, error: "Invalid recipient" };
  }

  if (!RESEND_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.log("[email dev]", params.subject, "→", params.to);
    }
    return { ok: true, skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text ?? stripHtml(params.html),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[email]", res.status, body);
    return { ok: false, error: "Send failed" };
  }

  return { ok: true };
}

export function siteUrl(path: string) {
  const base = SITE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
