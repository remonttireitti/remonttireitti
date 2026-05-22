import { HEAT_PUMP_JOB_SLUGS, type HeatPumpSlug } from "@/constants/heat-pumps";

/** Palauttaa projektin lämpöpumppu-työlajin slug (job_types tai details). */
export function resolveProjectJobTypeSlug(project: {
  job_types?: { slug: string } | { slug: string }[] | null;
  details?: Record<string, unknown> | null;
}): string | null {
  const jt = Array.isArray(project.job_types)
    ? project.job_types[0]
    : project.job_types;
  if (jt?.slug) return jt.slug;

  const d = project.details;
  if (!d || typeof d !== "object") return null;

  for (const slug of HEAT_PUMP_JOB_SLUGS) {
    if (slug in d && d[slug]) return slug;
  }

  return null;
}

export function isHeatPumpJobSlug(slug: string | null): slug is HeatPumpSlug {
  return slug != null && (HEAT_PUMP_JOB_SLUGS as readonly string[]).includes(slug);
}
