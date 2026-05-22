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

export type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  resendId?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY?.trim());
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  if (!params.to?.includes("@")) {
    console.warn("[email] invalid recipient:", params.to);
    return { ok: false, error: "Invalid recipient" };
  }

  if (!isEmailConfigured()) {
    console.warn(
      "[email] skipped (RESEND_API_KEY missing):",
      params.subject,
      "→",
      params.to,
    );
    return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" };
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
    console.error("[email] Resend error", res.status, body, "→", params.to);
    let message = "Send failed";
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (body) message = body.slice(0, 200);
    }
    return { ok: false, error: message };
  }

  let resendId: string | undefined;
  try {
    const data = (await res.json()) as { id?: string };
    resendId = data.id;
  } catch {
    /* ignore */
  }

  return { ok: true, resendId };
}

export function siteUrl(path: string) {
  const base = SITE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
