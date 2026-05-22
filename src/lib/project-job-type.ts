import { HEAT_PUMP_JOB_SLUGS, type HeatPumpSlug } from "@/constants/heat-pumps";
import { isHeatingSystemDetails } from "@/lib/heating-system-details";
import { isIlpDetails } from "@/lib/ilmalampopumppu-details";

/** Tunnistaa lämpöpumpputyypin projektin details-jsonista. */
export function resolveProjectDetailsKind(
  details: Record<string, unknown> | null | undefined,
): HeatPumpSlug | null {
  if (!details || typeof details !== "object") return null;

  if (details.ilmalampopumppu && isIlpDetails(details.ilmalampopumppu)) {
    return "ilmalampopumppu";
  }
  if (
    details.ilmavesilampopumppu &&
    isHeatingSystemDetails(details.ilmavesilampopumppu)
  ) {
    return "ilmavesilampopumppu";
  }
  if (
    details.maalampopumppu &&
    isHeatingSystemDetails(details.maalampopumppu)
  ) {
    return "maalampopumppu";
  }

  return null;
}

/** Palauttaa projektin lämpöpumpu-työlajin slug (job_types, job_type_id tai details). */
export function resolveProjectJobTypeSlug(project: {
  job_type_id?: string | null;
  job_types?: { slug: string } | { slug: string }[] | null;
  details?: Record<string, unknown> | null;
}): string | null {
  const jt = Array.isArray(project.job_types)
    ? project.job_types[0]
    : project.job_types;
  const slugFromJoin = jt?.slug?.trim();
  if (slugFromJoin && isHeatPumpJobSlug(slugFromJoin)) {
    return slugFromJoin;
  }

  const fromDetails = resolveProjectDetailsKind(project.details);
  if (fromDetails) return fromDetails;

  return null;
}

export function isHeatPumpJobSlug(slug: string | null): slug is HeatPumpSlug {
  return slug != null && (HEAT_PUMP_JOB_SLUGS as readonly string[]).includes(slug);
}
