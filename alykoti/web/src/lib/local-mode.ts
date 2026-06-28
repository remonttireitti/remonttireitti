/** Paikallinen Yellow Pi -tila ilman Supabase-kirjautumista. */

export const LOCAL_USER_ID = "local";

export function isLocalMode(): boolean {
  return process.env.ALYKOTI_LOCAL_MODE === "1" || process.env.ALYKOTI_LOCAL_MODE === "true";
}

export function getYellowApiUrl(): string {
  return (process.env.YELLOW_API_URL ?? "http://127.0.0.1:3080").replace(/\/$/, "");
}
