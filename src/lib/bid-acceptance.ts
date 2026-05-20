import { platformFeeDueAt } from "@/lib/platform-fee";

/** Päivää aikaa välitysmaksun maksamiseen asiakkaan hyväksynnän jälkeen. */
export const CONTRACTOR_COMMIT_DAYS = 7;

export const BID_COMMITMENT_NOTICE =
  "Lähettämällä tarjouksen sitoudut tarjouksen ehtoihin. Kun asiakas hyväksyy tarjouksesi, syntyy sopimus ja välityspalkkio laskutetaan. Voit kieltäytyä diilistä jättämällä välitysmaksun maksamatta — yhteystietoja ei avata.";

export function contractorCommitDeadline(from = new Date()): string {
  return platformFeeDueAt(from);
}

export function formatDeadlineFi(iso: string): string {
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isCommitDeadlinePassed(dueAt: string): boolean {
  return new Date(dueAt).getTime() < Date.now();
}

export function daysUntilDeadline(dueAt: string): number {
  const ms = new Date(dueAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
