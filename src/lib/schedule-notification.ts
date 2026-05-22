import { after } from "next/server";

/**
 * Ajaa ilmoitukset vastauksen jälkeen (Next.js after).
 * Ilman tätä Vercel voi katkaista sähköpostilähetyksen ennen valmistumista.
 */
export function scheduleNotification(task: () => Promise<unknown>): void {
  after(async () => {
    try {
      await task();
    } catch (err) {
      console.error("[notification] failed:", err);
    }
  });
}
