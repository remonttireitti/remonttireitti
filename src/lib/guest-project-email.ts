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

export async function sendGuestProjectVerificationEmail(params: {
  to: string;
  projectTitle: string;
  projectId: string;
  rawToken: string;
  pendingPublish: boolean;
}): Promise<void> {
  const verifyUrl = siteUrl(
    `/auth/vahvista-pyynto?project=${params.projectId}&token=${encodeURIComponent(params.rawToken)}`,
  );

  const body = params.pendingPublish
    ? `<p>Vahvista sähköpostiosoitteesi, jotta voimme julkaista tarjouspyyntösi <em>${escapeHtml(params.projectTitle)}</em> urakoitsijoille.</p>
       <p>Julkaisu tapahtuu vasta vahvistuksen jälkeen — urakoitsijoille ei lähetetä ilmoituksia ennen sitä.</p>
       <p>Linkki on voimassa 24 tuntia. Vahvistamatta jääneet tiedot poistetaan automaattisesti.</p>`
    : `<p>Vahvista sähköpostiosoitteesi ja avaa tarjouspyyntösi <em>${escapeHtml(params.projectTitle)}</em>.</p>
       <p>Linkki on voimassa 24 tuntia.</p>`;

  const result = await sendEmail({
    to: params.to,
    subject: params.pendingPublish
      ? "Vahvista tarjouspyyntösi — Remonttireitti"
      : "Avaa tarjouspyyntösi — Remonttireitti",
    html: emailLayout(
      params.pendingPublish ? "Vahvista ja julkaise" : "Vahvista sähköpostisi",
      body,
      verifyUrl,
      params.pendingPublish ? "Vahvista ja julkaise" : "Avaa tarjouspyyntö",
    ),
  });

  if (!result.ok && !result.skipped) {
    console.error("[guest-project-email] verify failed:", result.error);
  }
}

export async function sendGuestCompletionRequestEmail(params: {
  to: string;
  projectTitle: string;
  projectId: string;
  rawToken: string;
  contractorCompany: string;
  criterionCount: number;
}): Promise<void> {
  const taydennaUrl = siteUrl(
    `/auth/guest-access?project=${params.projectId}&token=${encodeURIComponent(params.rawToken)}&to=taydenna`,
  );

  const result = await sendEmail({
    to: params.to,
    subject: `Tarjouspyyntöösi tarvitaan lisätieto — ${params.projectTitle}`,
    html: emailLayout(
      "Täydennä tarjouspyyntöä",
      `<p><strong>${escapeHtml(params.contractorCompany)}</strong> tarvitsee ${params.criterionCount} lisätietoa tarkempaa tarjousta varten: <em>${escapeHtml(params.projectTitle)}</em>.</p>
       <p>Avaa linkki, täydennä pyyntö — ei kirjautumista tarvita.</p>`,
      taydennaUrl,
      "Täydennä tarjouspyyntö",
    ),
  });

  if (!result.ok && !result.skipped) {
    console.error("[guest-project-email] completion failed:", result.error);
  }
}

export async function sendGuestNewBidEmail(params: {
  to: string;
  projectTitle: string;
  projectId: string;
  rawToken: string;
  contractorCompany: string;
}): Promise<void> {
  const projectUrl = siteUrl(
    `/remontti/${params.projectId}?token=${encodeURIComponent(params.rawToken)}`,
  );

  const result = await sendEmail({
    to: params.to,
    subject: `Uusi tarjous: ${params.projectTitle}`,
    html: emailLayout(
      "Uusi tarjous",
      `<p><strong>${escapeHtml(params.contractorCompany)}</strong> jätti tarjouksen pyyntöösi <em>${escapeHtml(params.projectTitle)}</em>.</p>
       <p>Avaa linkki nähdäksesi tarjouksen — ei kirjautumista tarvita.</p>`,
      projectUrl,
      "Avaa tarjoukset",
    ),
  });

  if (!result.ok && !result.skipped) {
    console.error("[guest-project-email] new bid failed:", result.error);
  }
}

export async function sendGuestBidUpdatedEmail(params: {
  to: string;
  projectTitle: string;
  projectId: string;
  rawToken: string;
  contractorCompany: string;
  afterCompletion?: boolean;
}): Promise<void> {
  const projectUrl = siteUrl(
    `/auth/guest-access?project=${params.projectId}&token=${encodeURIComponent(params.rawToken)}`,
  );
  const extra = params.afterCompletion
    ? "<p>Urakoitsija on päivittänyt tarjouksen täydennettyjen tietojen jälkeen — voit nyt tarkastella ja hyväksyä tarjouksen.</p>"
    : "<p>Avaa linkki nähdäksesi muutokset — ei kirjautumista tarvita.</p>";

  const result = await sendEmail({
    to: params.to,
    subject: `Tarjous päivitetty: ${params.projectTitle}`,
    html: emailLayout(
      "Tarjous päivitetty",
      `<p><strong>${escapeHtml(params.contractorCompany)}</strong> päivitti tarjoustaan urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p>${extra}`,
      projectUrl,
      "Avaa tarjoukset",
    ),
  });

  if (!result.ok && !result.skipped) {
    console.error("[guest-project-email] bid updated failed:", result.error);
  }
}

export async function sendGuestBidWithdrawnEmail(params: {
  to: string;
  projectTitle: string;
  projectId: string;
  rawToken: string;
  contractorCompany: string;
}): Promise<void> {
  const projectUrl = siteUrl(
    `/auth/guest-access?project=${params.projectId}&token=${encodeURIComponent(params.rawToken)}`,
  );

  const result = await sendEmail({
    to: params.to,
    subject: `Tarjous peruttu: ${params.projectTitle}`,
    html: emailLayout(
      "Urakoitsija perui tarjouksen",
      `<p><strong>${escapeHtml(params.contractorCompany)}</strong> perui tarjouksensa urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p>
       <p>Muut tarjoukset ovat edelleen näkyvissä. Avaa linkki tarkastellaksesi tilannetta — ei kirjautumista tarvita.</p>`,
      projectUrl,
      "Avaa tarjoukset",
    ),
  });

  if (!result.ok && !result.skipped) {
    console.error("[guest-project-email] bid withdrawn failed:", result.error);
  }
}

export async function sendGuestProjectAccessEmail(params: {
  to: string;
  projectTitle: string;
  projectId: string;
  rawToken: string;
}): Promise<void> {
  const accessUrl = siteUrl(
    `/remontti/${params.projectId}?token=${encodeURIComponent(params.rawToken)}`,
  );

  const result = await sendEmail({
    to: params.to,
    subject: `Tarjouspyyntösi: ${params.projectTitle}`,
    html: emailLayout(
      "Henkilökohtainen linkki",
      `<p>Tässä on linkki tarjouspyyntöösi <em>${escapeHtml(params.projectTitle)}</em>.</p>
       <p>Säilytä linkki — voit palata tarjouksiin ja viesteihin ilman salasanaa.</p>`,
      accessUrl,
      "Avaa tarjouspyyntö",
    ),
  });

  if (!result.ok && !result.skipped) {
    console.error("[guest-project-email] access failed:", result.error);
  }
}
