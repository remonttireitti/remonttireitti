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
  notifyProjectMessage,
  notifyProjectCancelled,
  notifyProjectUpdated,
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
}) {
  const dl = formatDeadlineFi(params.commitDeadline);
  const fee = formatPlatformFee(params.feeCents);
  await inApp(
    params.contractorId,
    "bid_accepted",
    "Tarjous hyväksytty — viimeistele diili",
    `${params.projectTitle}: maksa välityspalkkio ${fee} veroton viimeistään ${dl}. Muuten diili raukeaa.`,
    `/tarjoukset/urakka/${params.projectId}`,
  );
  await notifyBidAccepted(params);
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
}) {
  await inApp(
    params.contractorId,
    "project_updated",
    "Tarjouspyyntö peruttu",
    `Asiakas perui pyynnön: ${params.projectTitle}`,
    "/tarjoukset",
  );
  await notifyProjectCancelled(params);
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
