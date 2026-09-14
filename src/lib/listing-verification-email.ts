import { sendEmail, siteUrl } from "@/lib/email";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailLayout(
  title: string,
  bodyHtml: string,
  ctaHref: string,
  ctaLabel: string,
) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;color:#1c1917">
      <p style="font-size:12px;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:.05em">Remonttireitti</p>
      <h1 style="font-size:18px;margin:16px 0 8px">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="margin:24px 0 0">
        <a href="${ctaHref}" style="display:inline-block;background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(ctaLabel)}</a>
      </p>
      <p style="margin:24px 0 0;font-size:12px;color:#78716c">
        Jos et pyytänyt tätä, voit jättää viestin huomiotta.
      </p>
    </div>
  `;
}

export async function sendListingVerificationEmail(params: {
  to: string;
  listingTitle: string;
  listingId: string;
  rawToken: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const verifyUrl = siteUrl(
    `/auth/vahvista-ilmoitus?listing=${params.listingId}&token=${encodeURIComponent(params.rawToken)}`,
  );

  const result = await sendEmail({
    to: params.to,
    subject: "Vahvista torin ilmoituksesi — Remonttireitti",
    html: emailLayout(
      "Vahvista ja julkaise",
      `<p>Vahvista sähköpostiosoitteesi, jotta voimme julkaista ilmoituksesi <em>${escapeHtml(params.listingTitle)}</em> remonttitorilla.</p>
       <p>Ilmoitus näkyy ostajille vasta vahvistuksen jälkeen.</p>
       <p>Linkki on voimassa 24 tuntia. Vahvistamatta jääneet ilmoitukset poistetaan automaattisesti.</p>`,
      verifyUrl,
      "Vahvista ja julkaise",
    ),
  });

  if (!result.ok && !result.skipped) {
    console.error("[listing-verification-email]", result.error);
  }

  return result;
}
