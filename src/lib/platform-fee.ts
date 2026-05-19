/** Välityspalkkio hyväksytystä tarjouksesta (sentit, ALV 0 % MVP-laskussa). */
export const PLATFORM_FEE_CENTS = 9900;

export const PLATFORM_FEE_VAT_RATE = 25.5;

export const PLATFORM_FEE_DUE_DAYS = 7;

export function formatPlatformFee(cents = PLATFORM_FEE_CENTS): string {
  return new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function platformFeeDueAt(from = new Date()): string {
  const due = new Date(from);
  due.setDate(due.getDate() + PLATFORM_FEE_DUE_DAYS);
  return due.toISOString();
}
