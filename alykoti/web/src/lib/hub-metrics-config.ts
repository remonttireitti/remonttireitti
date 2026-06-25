/** Pilvimittaukset — pois vain jos HUB_METRICS_ENABLED=0 (Supabase IO-hätä). */
export function hubMetricsEnabled(): boolean {
  const flag = process.env.HUB_METRICS_ENABLED?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return true;
}
