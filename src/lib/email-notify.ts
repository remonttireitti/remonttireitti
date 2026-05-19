import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";

async function userEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

function escapeHtml(s: string) {
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
    </div>
  `;
}

async function sendUserEmail(
  userId: string,
  subject: string,
  title: string,
  bodyHtml: string,
  ctaPath: string,
  ctaLabel: string,
) {
  const to = await userEmail(userId);
  if (!to) return;
  await sendEmail({
    to,
    subject,
    html: emailLayout(title, bodyHtml, siteUrl(ctaPath), ctaLabel),
  });
}

function formatEuros(amountEuros: number) {
  return amountEuros.toLocaleString("fi-FI");
}

/** Linkki projektiviestin sähköpostiin. */
export function projectMessageLinkPath(
  projectStatus: string,
  projectId: string,
  recipientIsContractor: boolean,
): string {
  if (!recipientIsContractor) return `/remontti/${projectId}`;
  if (["published", "receiving_bids"].includes(projectStatus)) {
    return `/tarjoukset/${projectId}`;
  }
  return `/tarjoukset/urakka/${projectId}`;
}

export async function notifyNewBid(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
  contractorCompany: string;
}) {
  await sendUserEmail(
    params.customerId,
    `Uusi tarjous: ${params.projectTitle}`,
    "Uusi tarjous",
    `<p><strong>${escapeHtml(params.contractorCompany)}</strong> jätti tarjouksen pyyntöösi <em>${escapeHtml(params.projectTitle)}</em>.</p>`,
    `/remontti/${params.projectId}`,
    "Avaa tarjoukset",
  );
}

export async function notifyBidUpdated(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
  contractorCompany: string;
}) {
  await sendUserEmail(
    params.customerId,
    `Tarjous päivitetty: ${params.projectTitle}`,
    "Tarjous päivitetty",
    `<p><strong>${escapeHtml(params.contractorCompany)}</strong> päivitti tarjoustaan urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p>`,
    `/remontti/${params.projectId}`,
    "Avaa tarjoukset",
  );
}

export async function notifyCounterOffer(params: {
  contractorId: string;
  projectTitle: string;
  projectId: string;
  amountEuros: number;
}) {
  await sendUserEmail(
    params.contractorId,
    `Vastatarjous: ${params.projectTitle}`,
    "Uusi vastatarjous",
    `<p>Asiakas ehdotti hintaa <strong>${formatEuros(params.amountEuros)} €</strong> urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p><p>Hyväksy vastatarjous tai säilytä alkuperäinen hinta.</p>`,
    `/tarjoukset/${params.projectId}`,
    "Vastaa vastatarjoukseen",
  );
}

export async function notifyCounterOfferAccepted(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
  amountEuros: number;
}) {
  await sendUserEmail(
    params.customerId,
    `Vastatarjous hyväksyttiin: ${params.projectTitle}`,
    "Vastatarjous hyväksytty",
    `<p>Urakoitsija hyväksyi vastatarjouksesi (<strong>${formatEuros(params.amountEuros)} €</strong>) urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p><p>Voit nyt hyväksyä tarjouksen lopullisesti.</p>`,
    `/remontti/${params.projectId}`,
    "Hyväksy tarjous",
  );
}

export async function notifyCounterOfferDeclined(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
  counterAmountEuros: number;
  originalAmountEuros: number;
}) {
  await sendUserEmail(
    params.customerId,
    `Vastatarjous hylättiin: ${params.projectTitle}`,
    "Vastatarjous hylätty",
    `<p>Urakoitsija hylkäsi vastatarjouksesi (<strong>${formatEuros(params.counterAmountEuros)} €</strong>) urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p><p>Alkuperäinen hinta <strong>${formatEuros(params.originalAmountEuros)} €</strong> on voimassa.</p>`,
    `/remontti/${params.projectId}`,
    "Avaa tarjoukset",
  );
}

export async function notifyProjectUpdated(params: {
  contractorId: string;
  projectTitle: string;
  projectId: string;
}) {
  await sendUserEmail(
    params.contractorId,
    `Tarjouspyyntö päivitetty: ${params.projectTitle}`,
    "Tarjouspyyntö muuttui",
    `<p>Asiakas muokkasi tarjouspyyntöä <em>${escapeHtml(params.projectTitle)}</em>.</p><p>Päivitä tarjouksesi, jotta asiakas voi hyväksyä sen.</p>`,
    `/tarjoukset/${params.projectId}`,
    "Päivitä tarjous",
  );
}

export async function notifyBidRejected(params: {
  contractorId: string;
  projectTitle: string;
  projectId: string;
  rejectionMessage: string | null;
}) {
  const comment = params.rejectionMessage?.trim()
    ? `<p>Asiakkaan kommentti:</p><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">${escapeHtml(params.rejectionMessage)}</blockquote>`
    : "";

  await sendUserEmail(
    params.contractorId,
    `Tarjous hylättiin: ${params.projectTitle}`,
    "Tarjous hylätty",
    `<p>Asiakas hylkäsi tarjouksesi urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p>${comment}<p>Voit päivittää ja lähettää tarjouksen uudelleen.</p>`,
    `/tarjoukset/${params.projectId}`,
    "Avaa tarjous",
  );
}

export async function notifyBidAccepted(params: {
  contractorId: string;
  projectTitle: string;
  projectId: string;
}) {
  await sendUserEmail(
    params.contractorId,
    `Tarjouksesi hyväksyttiin: ${params.projectTitle}`,
    "Tarjous hyväksytty",
    `<p>Asiakas hyväksyi tarjouksesi urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p><p>Maksa välitysmaksu nähdäksesi yhteystiedot.</p>`,
    `/tarjoukset/urakka/${params.projectId}`,
    "Avaa urakka",
  );
}

export async function notifyProjectMessage(params: {
  recipientId: string;
  projectTitle: string;
  projectId: string;
  preview: string;
  linkPath: string;
}) {
  const short = params.preview.slice(0, 200);
  await sendUserEmail(
    params.recipientId,
    `Uusi viesti: ${params.projectTitle}`,
    "Uusi viesti",
    `<p>Sinulle tuli viesti urakasta <em>${escapeHtml(params.projectTitle)}</em>:</p><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">${escapeHtml(short)}${params.preview.length > 200 ? "…" : ""}</blockquote>`,
    params.linkPath,
    "Lue ja vastaa",
  );
}

export async function notifyListingMessage(params: {
  recipientId: string;
  listingTitle: string;
  listingId: string;
  preview: string;
  asSeller: boolean;
}) {
  const to = await userEmail(params.recipientId);
  if (!to) return;

  await sendEmail({
    to,
    subject: `Viesti ilmoituksesta: ${params.listingTitle}`,
    html: emailLayout(
      "Uusi viesti markkinapaikalla",
      `<p>${params.asSeller ? "Ostajalta" : "Myyjältä"} tuli viesti ilmoituksesta <em>${escapeHtml(params.listingTitle)}</em>:</p><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">${escapeHtml(params.preview.slice(0, 120))}</blockquote>`,
      siteUrl(`/markkinapaikka/ilmoitukset/${params.listingId}`),
      "Avaa keskustelu",
    ),
  });
}
