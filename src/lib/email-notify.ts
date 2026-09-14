import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { getNotificationPrefs } from "@/lib/notification-prefs";

async function userEmail(userId: string): Promise<string | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;

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
  fallbackEmail?: string | null,
) {
  const prefs = await getNotificationPrefs(userId);
  if (!prefs.notifyEmail) return;

  let to = await userEmail(userId);
  if (!to && fallbackEmail?.includes("@")) {
    to = fallbackEmail.trim();
  }
  if (!to) {
    console.warn("[email-notify] no email for user", userId, subject);
    return;
  }
  const result = await sendEmail({
    to,
    subject,
    html: emailLayout(title, bodyHtml, siteUrl(ctaPath), ctaLabel),
  });
  if (!result.ok && !result.skipped) {
    console.error("[email-notify]", subject, "→", to, result.error);
  }
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
  contactEmail?: string | null;
}) {
  await sendUserEmail(
    params.customerId,
    `Uusi tarjous: ${params.projectTitle}`,
    "Uusi tarjous",
    `<p><strong>${escapeHtml(params.contractorCompany)}</strong> jätti tarjouksen pyyntöösi <em>${escapeHtml(params.projectTitle)}</em>.</p>`,
    `/remontti/${params.projectId}`,
    "Avaa tarjoukset",
    params.contactEmail,
  );
}

export async function notifyBidUpdated(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
  contractorCompany: string;
  contactEmail?: string | null;
  afterCompletion?: boolean;
}) {
  const extra = params.afterCompletion
    ? "<p>Urakoitsija on päivittänyt tarjouksen täydennettyjen tietojen jälkeen — voit nyt hyväksyä tarjouksen.</p>"
    : "";
  await sendUserEmail(
    params.customerId,
    `Tarjous päivitetty: ${params.projectTitle}`,
    "Tarjous päivitetty",
    `<p><strong>${escapeHtml(params.contractorCompany)}</strong> päivitti tarjoustaan urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p>${extra}`,
    `/remontti/${params.projectId}`,
    "Avaa tarjoukset",
    params.contactEmail,
  );
}

export async function notifyBidWithdrawn(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
  contractorCompany: string;
  contactEmail?: string | null;
}) {
  await sendUserEmail(
    params.customerId,
    `Tarjous peruttu: ${params.projectTitle}`,
    "Urakoitsija perui tarjouksen",
    `<p><strong>${escapeHtml(params.contractorCompany)}</strong> perui tarjouksensa urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p><p>Muut tarjoukset ovat edelleen näkyvissä.</p>`,
    `/remontti/${params.projectId}`,
    "Avaa tarjoukset",
    params.contactEmail,
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

export async function notifyProjectCompletionRequested(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
  contractorCompany: string;
  criterionCount: number;
}) {
  await sendUserEmail(
    params.customerId,
    `Täydennä tarjouspyyntöä: ${params.projectTitle}`,
    "Urakoitsija pyytää lisätietoja",
    `<p><strong>${escapeHtml(params.contractorCompany)}</strong> tarvitsee ${params.criterionCount} lisätietoa tarkempaa tarjousta varten: <em>${escapeHtml(params.projectTitle)}</em>.</p><p>Avaa linkki ja täydennä pyyntö.</p>`,
    `/remontti/${params.projectId}/taydenna`,
    "Täydennä tarjouspyyntö",
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

export async function notifyProjectCompletionUpdated(params: {
  contractorId: string;
  projectTitle: string;
  projectId: string;
  summary: string;
}) {
  await sendUserEmail(
    params.contractorId,
    `Asiakas täydensi pyyntöä: ${params.projectTitle}`,
    "Asiakas täydensi tarjouspyyntöä",
    `<p>Asiakas täydensi tarjouspyyntöä <em>${escapeHtml(params.projectTitle)}</em>: ${escapeHtml(params.summary)}.</p><p>Päivitä tarjouksesi uusien tietojen perusteella.</p>`,
    `/tarjoukset/${params.projectId}`,
    "Päivitä tarjous",
  );
}

export async function notifyProjectCancelled(params: {
  contractorId: string;
  projectTitle: string;
  projectId: string;
  autoClosed?: boolean;
}) {
  const body = params.autoClosed
    ? `<p>Tarjouspyyntö <em>${escapeHtml(params.projectTitle)}</em> suljettiin automaattisesti, koska asiakas ei päivittänyt tai sulkenut sitä ajoissa.</p><p>Tarjouksesi ei ole enää voimassa tähän pyyntöön.</p>`
    : `<p>Asiakas perui tarjouspyynnön <em>${escapeHtml(params.projectTitle)}</em>.</p><p>Tarjouksesi ei ole enää voimassa tähän pyyntöön.</p>`;

  await sendUserEmail(
    params.contractorId,
    params.autoClosed
      ? `Tarjouspyyntö suljettiin: ${params.projectTitle}`
      : `Tarjouspyyntö peruttu: ${params.projectTitle}`,
    params.autoClosed ? "Tarjouspyyntö suljettiin" : "Tarjouspyyntö peruttu",
    body,
    "/tarjoukset",
    "Selaa tarjouspyyntöjä",
  );
}

export async function notifyProjectInactivityWarning(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
  closeAt: string;
}) {
  const closeLabel = new Date(params.closeAt).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await sendUserEmail(
    params.customerId,
    `Tarjouspyyntö suljetaan pian: ${params.projectTitle}`,
    "Tarjouspyyntö suljetaan automaattisesti",
    `<p>Tarjouspyyntösi <em>${escapeHtml(params.projectTitle)}</em> suljetaan automaattisesti <strong>${escapeHtml(closeLabel)}</strong>, jos et päivitä, hyväksy tarjousta tai peru pyyntöä.</p><p>Suljettaessa saapuneet tarjoukset poistetaan käytöstä.</p>`,
    `/remontti/${params.projectId}`,
    "Avaa tarjouspyyntö",
  );
}

export async function notifyProjectAutoClosed(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
}) {
  await sendUserEmail(
    params.customerId,
    `Tarjouspyyntö suljettiin: ${params.projectTitle}`,
    "Tarjouspyyntö suljettiin automaattisesti",
    `<p>Tarjouspyyntösi <em>${escapeHtml(params.projectTitle)}</em> suljettiin automaattisesti, koska sitä ei päivitetty tai suljettu ajoissa.</p><p>Saapuneet tarjoukset on poistettu käytöstä. Voit poistaa pyynnön pysyvästi Oma tililtä.</p>`,
    "/oma-tili",
    "Oma tili",
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

export async function notifyOrderFinalizing(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
  contractorName: string;
  commitDeadline: string;
}) {
  const { formatDeadlineFi } = await import("@/lib/bid-acceptance");
  const dl = formatDeadlineFi(params.commitDeadline);
  await sendUserEmail(
    params.customerId,
    `Tilaus viimeistellään: ${params.projectTitle}`,
    "Urakoitsija viimeistelee tilausta",
    `<p><strong>${escapeHtml(params.contractorName)}</strong> hyväksyi diilin urakkaan <em>${escapeHtml(params.projectTitle)}</em> ja maksaa välityspalkkion viimeistään <strong>${escapeHtml(dl)}</strong>.</p><p>Saat ilmoituksen, kun yhteystiedot avautuvat.</p>`,
    `/remontti/${params.projectId}`,
    "Seuraa tilannetta",
  );
}

export async function notifyContactsRevealedCustomer(params: {
  customerId: string;
  projectTitle: string;
  projectId: string;
  contractorName: string;
}) {
  await sendUserEmail(
    params.customerId,
    `Urakoitsija valittu: ${params.projectTitle}`,
    "Yhteystiedot urakoitsijalle",
    `<p><strong>${escapeHtml(params.contractorName)}</strong> on valittu urakoitsijaksi urakkaan <em>${escapeHtml(params.projectTitle)}</em>.</p><p>Urakoitsija näkee yhteystietosi ja voi ottaa yhteyttä jatkaakseen sopimusta.</p>`,
    `/remontti/${params.projectId}`,
    "Avaa urakka",
  );
}

export async function notifyBidAccepted(params: {
  contractorId: string;
  projectTitle: string;
  projectId: string;
  commitDeadline: string;
  feeCents: number;
  feeWaiverReason?: import("@/lib/platform-fee-waiver").PlatformFeeWaiverReason | null;
  acceptedAmountCents: number;
  acceptedIncludesEquipment: boolean;
}) {
  const { formatDeadlineFi } = await import("@/lib/bid-acceptance");
  const { formatPlatformFeeInvoiceLine } = await import("@/lib/platform-fee");
  const scope = params.acceptedIncludesEquipment
    ? "asennus ja laite"
    : "vain asennus";

  if (params.feeCents === 0) {
    const { platformFeeWaiverShortLabel } = await import("@/lib/platform-fee-waiver");
    const waiverLabel = platformFeeWaiverShortLabel(params.feeWaiverReason);
    await sendUserEmail(
      params.contractorId,
      `Tarjouksesi hyväksyttiin: ${params.projectTitle}`,
      waiverLabel,
      `<p>Asiakas hyväksyi tarjouksesi urakkaan <em>${escapeHtml(params.projectTitle)}</em> (${scope}, ${formatEuros(params.acceptedAmountCents / 100)} €).</p>
       <p><strong>${escapeHtml(waiverLabel)}.</strong> Asiakkaan yhteystiedot ovat nyt näkyvissä urakkasivulla.</p>`,
      `/tarjoukset/urakka/${params.projectId}`,
      "Avaa yhteystiedot",
    );
    return;
  }

  const dl = formatDeadlineFi(params.commitDeadline);
  const feeLine = formatPlatformFeeInvoiceLine(params.feeCents);
  await sendUserEmail(
    params.contractorId,
    `Tarjouksesi hyväksyttiin: ${params.projectTitle}`,
    "Viimeistele diili määräajassa",
    `<p>Asiakas hyväksyi tarjouksesi urakkaan <em>${escapeHtml(params.projectTitle)}</em> (${scope}, ${formatEuros(params.acceptedAmountCents / 100)} €).</p>
     <p><strong>Maksa välityspalkkio viimeistään ${escapeHtml(dl)}:</strong> ${escapeHtml(feeLine)}.</p>
     <p style="color:#b45309">Jos et maksa määräajassa, diili raukeaa ja asiakas voi valita toisen urakoitsijan.</p>`,
    `/tarjoukset/urakka/${params.projectId}`,
    "Viimeistele tilaus",
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

export async function notifyReviewReminder(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  contractorName: string;
}) {
  await sendUserEmail(
    params.customerId,
    `Arvostele urakoitsija: ${params.projectTitle}`,
    "Miten urakka sujui?",
    `<p>Urakka <em>${escapeHtml(params.projectTitle)}</em> on valmis. Kerro lyhyesti kokemuksestasi urakoitsijasta <strong>${escapeHtml(params.contractorName)}</strong> — arvostelut auttavat muita asiakkaita.</p>`,
    `/remontti/${params.projectId}`,
    "Jätä arvostelu",
  );
}

export async function notifyHuoltokirjaSync(params: {
  customerId: string;
  propertyId: string;
  projectTitle: string;
}) {
  await sendUserEmail(
    params.customerId,
    `Urakka lisätty huoltokirjaan: ${params.projectTitle}`,
    "Remontti ei lopu tähän",
    `<p>Valmistunut urakka <em>${escapeHtml(params.projectTitle)}</em> on nyt huoltokirjassasi. Voit lisätä myös aiempia remontteja ja seurata laitteiden takuita samassa paikassa.</p>`,
    `/oma-tili/huoltokirja/${params.propertyId}`,
    "Avaa huoltokirja",
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
