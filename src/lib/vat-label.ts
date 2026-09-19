/** ALV-merkinnät kaikissa hinnoissa. */

export type VatTreatment = "included" | "excluded";

export const VAT_LABEL_INCLUDED = "sis. ALV";
export const VAT_LABEL_EXCLUDED = "ALV 0 %";

/** Kuluttajahinnat (budjetit, julkiset laskurit). */
export const CONSUMER_VAT: VatTreatment = "included";

/** Urakoitsijan kustannuslaskelma (tarjouslaskuri). */
export const CONTRACTOR_COST_VAT: VatTreatment = "excluded";

export function vatIncludedFromTreatment(
  treatment: VatTreatment | boolean,
): boolean {
  if (typeof treatment === "boolean") return treatment;
  return treatment === "included";
}

export function vatLabel(treatment: VatTreatment | boolean): string {
  return vatIncludedFromTreatment(treatment)
    ? VAT_LABEL_INCLUDED
    : VAT_LABEL_EXCLUDED;
}

export function vatLabelInParens(treatment: VatTreatment | boolean): string {
  return `(${vatLabel(treatment)})`;
}

/** Esim. "15 000 € (sis. ALV)" */
export function formatEurosWithVatLabel(
  euros: number,
  treatment: VatTreatment | boolean,
): string {
  return `${euros.toLocaleString("fi-FI")} € ${vatLabelInParens(treatment)}`;
}

/** Esim. "15 000 € (sis. ALV)" senteistä. */
export function formatCentsWithVatLabel(
  cents: number,
  treatment: VatTreatment | boolean,
): string {
  const euros = Math.round(cents / 100);
  return formatEurosWithVatLabel(euros, treatment);
}

/** Budjettiväli ALV-merkinnällä. */
export function formatBudgetWithVat(
  min: number | null,
  max: number | null,
  treatment: VatTreatment | boolean = CONSUMER_VAT,
): string {
  const suffix = ` ${vatLabelInParens(treatment)}`;

  if (min == null && max == null) return "Ei ilmoitettu";
  if (min != null && max != null) {
    return `${min.toLocaleString("fi-FI")} – ${max.toLocaleString("fi-FI")} €${suffix}`;
  }
  if (max != null) {
    return `Enintään ${max.toLocaleString("fi-FI")} €${suffix}`;
  }
  return `Vähintään ${min!.toLocaleString("fi-FI")} €${suffix}`;
}

/** Tarjouslomakkeen hintakentän otsikko. */
export function bidAmountFieldLabel(
  baseLabel: string,
  vatIncluded: boolean,
): string {
  const stripped = baseLabel.replace(/\s*\(€[^)]*\)\s*\*?$/, "").trim();
  const vatPart = vatIncluded ? "sis. ALV" : "ALV 0 %";
  return `${stripped} (€, ${vatPart}) *`;
}
