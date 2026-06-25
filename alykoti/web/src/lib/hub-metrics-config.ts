/** Pilvimittaukset oletuksena pois Vercelissä — Supabase IO säästö. */
export function hubMetricsEnabled(): boolean {
  const flag = process.env.HUB_METRICS_ENABLED?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return process.env.VERCEL !== "1";
}
