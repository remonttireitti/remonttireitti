/** Työlaji, kun asiakas ei löydä valmiista listasta. */
export const FREE_FORM_JOB_SLUG = "vapaa-pyynto" as const;

export function isFreeFormJobSlug(slug: string | null | undefined): boolean {
  return slug === FREE_FORM_JOB_SLUG;
}

export type CustomRequestDetails = {
  custom_request: {
    label: string;
  };
};

export function customRequestLabelFromDetails(
  details: unknown,
): string | null {
  if (!details || typeof details !== "object") return null;
  const cr = (details as CustomRequestDetails).custom_request;
  if (!cr?.label || typeof cr.label !== "string") return null;
  const label = cr.label.trim();
  return label.length >= 3 ? label : null;
}
