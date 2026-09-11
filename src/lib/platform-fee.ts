/**
 * Välityspalkkio hyväksytystä tarjouksesta (maksu per diili -malli).
 * Kuukausitilauksella per-diili -palkkio on 0 €.
 */

/** Maksu per hyväksytty diili ilman kuukausitilausta (veroton). */
export const PAY_PER_DEAL_FEE_CENTS = 3900;

export const PLATFORM_FEE_VAT_RATE = 25.5;

export const PLATFORM_FEE_DUE_DAYS = 7;

/** Näytettävä selite hinnoittelussa ja laskuissa. */
export const B2B_PRICE_VAT_NOTE =
  "Hinnat ovat verottomia. Arvonlisävero lisätään laskulle yritysasiakkaalle.";

/** @deprecated Käytä PAY_PER_DEAL_FEE_CENTS */
export const PLATFORM_FEE_CENTS = PAY_PER_DEAL_FEE_CENTS;

/** Per-diili -palkkio sentteinä (veroton). */
export function payPerDealFeeCents(): number {
  return PAY_PER_DEAL_FEE_CENTS;
}

/** @deprecated Käytä payPerDealFeeCents — taaksepäin yhteensopivuus. */
export function computePlatformFeeCentsForJob(
  _jobTypeSlug?: string,
  _bidderCount?: number,
): number {
  return PAY_PER_DEAL_FEE_CENTS;
}

export function formatPlatformFee(cents: number = PAY_PER_DEAL_FEE_CENTS): string {
  return new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Veroton summa sentteinä → laskun kokonaissumma ALV:n kanssa. */
export function grossCentsFromNet(
  netCents: number,
  vatRate = PLATFORM_FEE_VAT_RATE,
): number {
  return Math.round(netCents * (1 + vatRate / 100));
}

/** Esim. "39 € veroton → laskulla n. 49 € (ALV 25,5 %)" */
export function formatPlatformFeeInvoiceLine(netCents: number): string {
  const net = formatPlatformFee(netCents);
  const gross = formatPlatformFee(grossCentsFromNet(netCents));
  return `${net} veroton → laskulla noin ${gross} (sis. ALV ${vatRateLabel()})`;
}

function vatRateLabel(): string {
  return Number.isInteger(PLATFORM_FEE_VAT_RATE)
    ? `${PLATFORM_FEE_VAT_RATE} %`
    : `${PLATFORM_FEE_VAT_RATE.toLocaleString("fi-FI")} %`;
}

export function platformFeeDueAt(from = new Date()): string {
  const due = new Date(from);
  due.setDate(due.getDate() + PLATFORM_FEE_DUE_DAYS);
  return due.toISOString();
}
