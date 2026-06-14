/** Julkaistut palvelutyöt (ei remonttiurakoita). */
export const SERVICE_JOB_SLUGS = [
  "siivous-koti",
  "siivous-loppu",
  "muutto",
  "kuljetus",
  "ikkunanpesu",
  "kattopesu",
  "nurmikon-leikkuu",
  "lumityo",
] as const;

export type ServiceJobSlug = (typeof SERVICE_JOB_SLUGS)[number];

export function isServiceJobSlug(slug: string | null | undefined): slug is ServiceJobSlug {
  return (SERVICE_JOB_SLUGS as readonly string[]).includes(slug ?? "");
}
