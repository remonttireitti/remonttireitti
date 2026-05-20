/**
 * Välityspalkkio hyväksytystä tarjouksesta.
 * Kaikki amount_cents / hinnastohinnat ovat VEROTTOMIA (alv 0 % myyntihinta).
 * ALV lisätään erikseen B2B-laskulle (kevyt yrittäjä / ALV-rekisteröity myyjä).
 */

export const PLATFORM_FEE_VAT_RATE = 25.5;

export const PLATFORM_FEE_DUE_DAYS = 7;

/** Näytettävä selite hinnoittelussa ja laskuissa. */
export const B2B_PRICE_VAT_NOTE =
  "Hinnat ovat verottomia. Arvonlisävero lisätään laskulle yritysasiakkaalle.";

/** @deprecated Käytä computePlatformFeeCents — vanha kiinteä oletus vain taaksepäin yhteensopivuuteen. */
export const PLATFORM_FEE_CENTS = 9900;

/** Provisioluokat: ilp = ilmalämpö, large = vesi-ilma / maalämpö, maintenance = huolto/korjaus. */
export type PlatformFeeCategory = "ilp" | "large" | "maintenance";

/** Provisio sentteinä: [1–3 tarjoajaa, 4–6 tarjoajaa, 7+ tarjoajaa]. */
export const PLATFORM_FEE_TIERS_CENTS: Record<
  PlatformFeeCategory,
  readonly [number, number, number]
> = {
  ilp: [2000, 2500, 3000],
  large: [4000, 5000, 6000],
  maintenance: [800, 1000, 1200],
};

export const PLATFORM_FEE_CATEGORY_LABELS: Record<PlatformFeeCategory, string> =
  {
    ilp: "Ilmalämpöpumppu (asennus)",
    large: "Vesi-ilmalämpö / maalämpö (asennus)",
    maintenance: "Huolto tai korjaus",
  };

export function platformFeeCategoryFromJobSlug(slug: string): PlatformFeeCategory {
  if (slug === "ilmalampopumppu") return "ilp";
  if (slug === "ilmavesilampopumppu" || slug === "maalampopumppu") {
    return "large";
  }
  if (slug === "lampopumppu-huolto" || slug === "lampopumppu-korjaus") {
    return "maintenance";
  }
  return "ilp";
}

/**
 * Laskee välityspalkkion tarjoajamäärän mukaan.
 * - 1–3 tarjoajaa → alempi taso
 * - 4–6 tarjoajaa → keskitaso
 * - 7+ tarjoajaa → ylin taso
 */
export function computePlatformFeeCents(
  category: PlatformFeeCategory,
  bidderCount: number,
): number {
  const n = Math.max(1, Math.floor(bidderCount));
  const [low, mid, high] = PLATFORM_FEE_TIERS_CENTS[category];
  if (n <= 3) return low;
  if (n <= 6) return mid;
  return high;
}

export function computePlatformFeeCentsForJob(
  jobTypeSlug: string,
  bidderCount: number,
): number {
  return computePlatformFeeCents(
    platformFeeCategoryFromJobSlug(jobTypeSlug),
    bidderCount,
  );
}

export function formatPlatformFee(cents: number = PLATFORM_FEE_CENTS): string {
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

/** Esim. "20 € veroton → laskulla n. 25 € (ALV 25,5 %)" */
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

export function platformFeeTierDescription(
  category: PlatformFeeCategory,
): { maxBidders: string; amounts: [string, string, string] } {
  const [a, b, c] = PLATFORM_FEE_TIERS_CENTS[category].map((x) =>
    formatPlatformFee(x),
  );
  return {
    maxBidders: "1–2 / 3–6 / 7+ tarjoajaa",
    amounts: [a, b, c],
  };
}

export function platformFeeDueAt(from = new Date()): string {
  const due = new Date(from);
  due.setDate(due.getDate() + PLATFORM_FEE_DUE_DAYS);
  return due.toISOString();
}
