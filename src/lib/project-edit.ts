import { isHeatingSystemDetails } from "@/lib/heating-system-details";
import { isIlpDetails } from "@/lib/ilmalampopumppu-details";
import { INITIAL_ILP_DETAILS } from "@/types/ilmalampopumppu-details";
import { INITIAL_IVLP_DETAILS } from "@/types/ilmavesilampopumppu-details";
import { INITIAL_MAALAMP_DETAILS } from "@/types/maalampopumppu-details";
import type { IlmalampopumppuDetails } from "@/types/ilmalampopumppu-details";
import type { IlmavesilampopumppuDetails } from "@/types/ilmavesilampopumppu-details";
import type { MaalampopumppuDetails } from "@/types/maalampopumppu-details";

export type ProjectEditFormState = {
  job_type_id: string;
  category_id: string;
  trade_ids: string[];
  title: string;
  description: string;
  budget_min: string;
  budget_max: string;
  desired_start: string;
  flexibility_weeks: string;
  municipality: string;
  postal_code: string;
  address_line: string;
  contact_email: string;
  contact_phone: string;
};

export type ProjectEditSnapshot = {
  projectId: string;
  jobTypeId: string;
  categoryId: string;
  tradeIds: string[];
  form: ProjectEditFormState;
  ilpDetails: IlmalampopumppuDetails;
  ivlpDetails: IlmavesilampopumppuDetails;
  maalampDetails: MaalampopumppuDetails;
  detailsKind: "" | "ilmalampopumppu" | "ilmavesilampopumppu" | "maalampopumppu";
};

export function buildProjectEditSnapshot(project: {
  id: string;
  job_type_id: string | null;
  category_id: string;
  title: string;
  description: string;
  municipality: string;
  postal_code: string;
  address_line: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  budget_min: number | null;
  budget_max: number | null;
  desired_start: string | null;
  flexibility_weeks: number | null;
  details: unknown;
}, tradeIds: string[]): ProjectEditSnapshot {
  const details = project.details as Record<string, unknown> | null;
  let detailsKind: ProjectEditSnapshot["detailsKind"] = "";
  let ilpDetails = { ...INITIAL_ILP_DETAILS };
  let ivlpDetails = { ...INITIAL_IVLP_DETAILS };
  let maalampDetails = { ...INITIAL_MAALAMP_DETAILS };

  if (details?.ilmalampopumppu && isIlpDetails(details.ilmalampopumppu)) {
    detailsKind = "ilmalampopumppu";
    ilpDetails = details.ilmalampopumppu;
  } else if (
    details?.ilmavesilampopumppu &&
    isHeatingSystemDetails(details.ilmavesilampopumppu)
  ) {
    detailsKind = "ilmavesilampopumppu";
    ivlpDetails = details.ilmavesilampopumppu as IlmavesilampopumppuDetails;
  } else if (
    details?.maalampopumppu &&
    isHeatingSystemDetails(details.maalampopumppu)
  ) {
    detailsKind = "maalampopumppu";
    maalampDetails = details.maalampopumppu as MaalampopumppuDetails;
  }

  return {
    projectId: project.id,
    jobTypeId: project.job_type_id ?? "",
    categoryId: project.category_id,
    tradeIds,
    detailsKind,
    ilpDetails,
    ivlpDetails,
    maalampDetails,
    form: {
      job_type_id: project.job_type_id ?? "",
      category_id: project.category_id,
      trade_ids: tradeIds,
      title: project.title,
      description: project.description,
      budget_min: project.budget_min != null ? String(project.budget_min) : "",
      budget_max: project.budget_max != null ? String(project.budget_max) : "",
      desired_start: project.desired_start ?? "",
      flexibility_weeks: String(project.flexibility_weeks ?? 4),
      municipality: project.municipality,
      postal_code: project.postal_code,
      address_line: project.address_line ?? "",
      contact_email: project.contact_email ?? "",
      contact_phone: project.contact_phone ?? "",
    },
  };
}
