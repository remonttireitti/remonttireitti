/**
 * Lähettää sekä sovellusilmoituksen että sähköpostin (jos Resend on käytössä).
 */
import {
  notifyBidAccepted,
  notifyBidRejected,
  notifyBidUpdated,
  notifyCounterOffer,
  notifyCounterOfferAccepted,
  notifyCounterOfferDeclined,
  notifyNewBid,
  notifyContactsRevealedCustomer,
  notifyOrderFinalizing,
  notifyProjectMessage,
  notifyProjectCancelled,
  notifyProjectUpdated,
  notifyProjectInactivityWarning,
  notifyProjectAutoClosed,
  projectMessageLinkPath,
} from "@/lib/email-notify";
import { createNotification } from "@/lib/notifications-server";
import { getNotificationPrefs } from "@/lib/notification-prefs";
import { formatDeadlineFi } from "@/lib/bid-acceptance";
import type { NotificationType } from "@/lib/notifications";
import { formatPlatformFee } from "@/lib/platform-fee";

async function inApp(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  linkPath: string,
) {
  const prefs = await getNotificationPrefs(userId);
  if (!prefs.notifyInApp) return;
  await createNotification({ userId, type, title, body, linkPath });
}

export async function userNotifyNewBid(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  contractorCompany: string;
}) {
  await inApp(
    params.customerId,
    "new_bid",
    "Uusi tarjous",
    `${params.contractorCompany} jätti tarjouksen: ${params.projectTitle}`,
    `/remontti/${params.projectId}`,
  );
  await notifyNewBid(params);
}

export async function userNotifyBidUpdated(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  contractorCompany: string;
}) {
  await inApp(
    params.customerId,
    "new_bid",
    "Tarjous päivitetty",
    `${params.contractorCompany} päivitti tarjousta: ${params.projectTitle}`,
    `/remontti/${params.projectId}`,
  );
  await notifyBidUpdated(params);
}

export async function userNotifyCounterOffer(params: {
  contractorId: string;
  projectId: string;
  projectTitle: string;
  amountEuros: number;
}) {
  const formatted = params.amountEuros.toLocaleString("fi-FI");
  await inApp(
    params.contractorId,
    "counter_offer",
    "Uusi vastatarjous",
    `Asiakas ehdotti ${formatted} €: ${params.projectTitle}`,
    `/tarjoukset/${params.projectId}`,
  );
  await notifyCounterOffer(params);
}

export async function userNotifyCounterOfferAccepted(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  amountEuros: number;
}) {
  await inApp(
    params.customerId,
    "counter_offer_accepted",
    "Vastatarjous hyväksytty",
    `Urakoitsija hyväksyi vastatarjouksesi: ${params.projectTitle}`,
    `/remontti/${params.projectId}`,
  );
  await notifyCounterOfferAccepted(params);
}

export async function userNotifyCounterOfferDeclined(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  counterAmountEuros: number;
  originalAmountEuros: number;
}) {
  await inApp(
    params.customerId,
    "counter_offer_declined",
    "Vastatarjous hylätty",
    `Urakoitsija hylkäsi vastatarjouksesi: ${params.projectTitle}`,
    `/remontti/${params.projectId}`,
  );
  await notifyCounterOfferDeclined(params);
}

export async function userNotifyBidRejected(params: {
  contractorId: string;
  projectId: string;
  projectTitle: string;
  rejectionMessage: string | null;
}) {
  await inApp(
    params.contractorId,
    "bid_rejected",
    "Tarjous hylättiin",
    `Asiakas hylkäsi tarjouksesi: ${params.projectTitle}`,
    `/tarjoukset/${params.projectId}`,
  );
  await notifyBidRejected(params);
}

export async function userNotifyBidAccepted(params: {
  contractorId: string;
  projectId: string;
  projectTitle: string;
  commitDeadline: string;
  feeCents: number;
  acceptedAmountCents: number;
  acceptedIncludesEquipment: boolean;
}) {
  const amount = new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(params.acceptedAmountCents / 100);
  const scope = params.acceptedIncludesEquipment
    ? "asennus + laite"
    : "vain asennus";

  if (params.feeCents === 0) {
    await inApp(
      params.contractorId,
      "bid_accepted",
      "Tarjous hyväksytty — yhteystiedot auki",
      `${params.projectTitle}: asiakas hyväksyi ${scope} (${amount}). Beta-etu: ei välitysmaksua — asiakkaan yhteystiedot ovat nyt näkyvissä.`,
      `/tarjoukset/urakka/${params.projectId}`,
    );
    await notifyBidAccepted(params);
    return;
  }

  const dl = formatDeadlineFi(params.commitDeadline);
  const fee = formatPlatformFee(params.feeCents);
  await inApp(
    params.contractorId,
    "bid_accepted",
    "Tarjous hyväksytty — viimeistele diili",
    `${params.projectTitle}: asiakas hyväksyi ${scope} (${amount}). Maksa välityspalkkio ${fee} veroton viimeistään ${dl}.`,
    `/tarjoukset/urakka/${params.projectId}`,
  );
  await notifyBidAccepted(params);
}

export async function userNotifyContactsRevealedCustomer(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  contractorName: string;
}) {
  await inApp(
    params.customerId,
    "order_finalizing",
    "Yhteystiedot avautuivat",
    `${params.contractorName} on valittu urakoitsijaksi: ${params.projectTitle}. Urakoitsija näkee yhteystietosi ja voi ottaa yhteyttä.`,
    `/remontti/${params.projectId}`,
  );
  await notifyContactsRevealedCustomer(params);
}

export async function userNotifyOrderFinalizing(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  contractorName: string;
  commitDeadline: string;
}) {
  const dl = formatDeadlineFi(params.commitDeadline);
  await inApp(
    params.customerId,
    "order_finalizing",
    "Tilaus viimeistellään",
    `${params.contractorName} viimeistelee tilausta (välitysmaksu) viimeistään ${dl}. Saat ilmoituksen kun yhteystiedot avautuvat.`,
    `/remontti/${params.projectId}`,
  );
  await notifyOrderFinalizing(params);
}

export async function userNotifyBidAcceptExpiredCustomer(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  contractorName: string;
}) {
  await inApp(
    params.customerId,
    "bid_accept_lapsed",
    "Voit valita toisen urakoitsijan",
    `${params.contractorName} ei viimeistellyt tilausta määräajassa. Voit hyväksyä toisen tarjouksen: ${params.projectTitle}`,
    `/remontti/${params.projectId}`,
  );
}

export async function userNotifyBidAcceptExpiredContractor(params: {
  contractorId: string;
  projectId: string;
  projectTitle: string;
}) {
  await inApp(
    params.contractorId,
    "bid_accept_lapsed",
    "Diili rauennut",
    `Et maksanut välityspalkkiota määräajassa: ${params.projectTitle}. Asiakas voi valita toisen urakoitsijan.`,
    `/tarjoukset`,
  );
}

export async function userNotifyProjectUpdated(params: {
  contractorId: string;
  projectId: string;
  projectTitle: string;
}) {
  await inApp(
    params.contractorId,
    "project_updated",
    "Tarjouspyyntö päivitetty",
    `Asiakas muokkasi pyyntöä: ${params.projectTitle}`,
    `/tarjoukset/${params.projectId}`,
  );
  await notifyProjectUpdated(params);
}

export async function userNotifyProjectCancelled(params: {
  contractorId: string;
  projectId: string;
  projectTitle: string;
  autoClosed?: boolean;
}) {
  await inApp(
    params.contractorId,
    "project_updated",
    params.autoClosed ? "Tarjouspyyntö suljettiin" : "Tarjouspyyntö peruttu",
    params.autoClosed
      ? `Pyyntö suljettiin automaattisesti: ${params.projectTitle}`
      : `Asiakas perui pyynnön: ${params.projectTitle}`,
    "/tarjoukset",
  );
  await notifyProjectCancelled(params);
}

export async function userNotifyProjectInactivityWarning(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  closeAt: string;
}) {
  const closeLabel = new Date(params.closeAt).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "long",
  });

  await inApp(
    params.customerId,
    "project_inactivity_warning",
    "Tarjouspyyntö suljetaan pian",
    `${params.projectTitle} suljetaan ${closeLabel}, jos et toimi. Päivitä, valitse tarjous tai peru pyyntö.`,
    `/remontti/${params.projectId}`,
  );
  await notifyProjectInactivityWarning(params);
}

export async function userNotifyProjectAutoClosed(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  closedAt: string;
}) {
  await inApp(
    params.customerId,
    "project_auto_closed",
    "Tarjouspyyntö suljettiin",
    `${params.projectTitle} suljettiin automaattisesti. Tarjoukset poistettiin käytöstä.`,
    "/oma-tili",
  );
  await notifyProjectAutoClosed({
    customerId: params.customerId,
    projectId: params.projectId,
    projectTitle: params.projectTitle,
  });
}

export async function userNotifyReviewReminder(params: {
  customerId: string;
  projectId: string;
  projectTitle: string;
  contractorName: string;
}) {
  await inApp(
    params.customerId,
    "review_reminder",
    "Miten urakka sujui?",
    `Kerro kokemuksestasi urakoitsijasta ${params.contractorName}: ${params.projectTitle}`,
    `/remontti/${params.projectId}`,
  );
}

export async function userNotifyProjectMessage(params: {
  recipientId: string;
  projectId: string;
  projectTitle: string;
  projectStatus: string;
  preview: string;
  recipientIsContractor: boolean;
}) {
  const linkPath = projectMessageLinkPath(
    params.projectStatus,
    params.projectId,
    params.recipientIsContractor,
  );
  const short =
    params.preview.length > 120 ? `${params.preview.slice(0, 117)}…` : params.preview;

  await inApp(
    params.recipientId,
    "new_message",
    "Uusi viesti",
    `${params.projectTitle}: ${short}`,
    linkPath,
  );
  await notifyProjectMessage({
    recipientId: params.recipientId,
    projectTitle: params.projectTitle,
    projectId: params.projectId,
    preview: params.preview,
    linkPath,
  });
}
