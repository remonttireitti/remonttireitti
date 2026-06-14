import type { JobCatalog } from "@/types/job-catalog";

export type RemonttiPrefill = {
  jobSlug?: string;
  description?: string;
  municipality?: string;
  postal_code?: string;
  title?: string;
  listingId?: string;
};

export function parseRemonttiPrefillFromSearchParams(
  params: Record<string, string | undefined>,
): RemonttiPrefill {
  const prefill: RemonttiPrefill = {};

  const tyyppi = params.tyyppi?.trim();
  if (tyyppi) prefill.jobSlug = tyyppi;

  const kuvaus = params.kuvaus?.trim();
  if (kuvaus) {
    prefill.description = kuvaus.length >= 20 ? kuvaus : `${kuvaus} `.padEnd(22, ".");
  }

  const kunta = params.kunta?.trim();
  if (kunta) prefill.municipality = kunta;

  const postinumero = params.postinumero?.trim();
  if (postinumero && /^\d{5}$/.test(postinumero)) {
    prefill.postal_code = postinumero;
  }

  const listingId = params.listing_id?.trim();
  if (listingId) prefill.listingId = listingId;

  return prefill;
}

export function applyRemonttiPrefillToForm(
  catalog: JobCatalog,
  prefill: RemonttiPrefill,
  base: {
    contact_email: string;
    contact_phone: string;
  },
) {
  const job = prefill.jobSlug
    ? catalog.jobTypes.find((j) => j.slug === prefill.jobSlug)
    : null;

  return {
    job,
    initialStep: job ? 1 : 0,
    formPatch: {
      job_type_id: job?.id ?? "",
      category_id: job?.legacy_category_id ?? "",
      trade_ids:
        job && job.suggested_trade_ids.length > 0
          ? [...job.suggested_trade_ids]
          : [],
      title: prefill.title ?? job?.name_fi ?? "",
      description: prefill.description ?? "",
      municipality: prefill.municipality ?? "",
      postal_code: prefill.postal_code ?? "",
      contact_email: base.contact_email,
      contact_phone: base.contact_phone,
    },
  };
}
