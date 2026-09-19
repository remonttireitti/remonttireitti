/** Vertaa urakoitsijan syöttämää yksikköhintaa laskurin viitehintaan. */
export type LinePriceComparison = "cheaper" | "similar" | "more_expensive";

const SIMILAR_LOW = 0.92;
const SIMILAR_HIGH = 1.08;

export function compareUnitPrice(
  entered: number,
  reference: number,
): LinePriceComparison | null {
  if (!Number.isFinite(entered) || !Number.isFinite(reference)) return null;
  if (reference <= 0 || entered <= 0) return null;
  const ratio = entered / reference;
  if (ratio <= SIMILAR_LOW) return "cheaper";
  if (ratio >= SIMILAR_HIGH) return "more_expensive";
  return "similar";
}

export function compareLineTotal(
  enteredTotal: number,
  referenceTotal: number,
): LinePriceComparison | null {
  return compareUnitPrice(enteredTotal, referenceTotal);
}

export const LINE_PRICE_COMPARISON_LABELS: Record<LinePriceComparison, string> = {
  cheaper: "Edullisempi",
  similar: "Lähes sama",
  more_expensive: "Kalliimpi",
};

export function linePriceComparisonBadgeClass(
  comparison: LinePriceComparison,
): string {
  switch (comparison) {
    case "cheaper":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "similar":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "more_expensive":
      return "border-amber-200 bg-amber-50 text-amber-950";
  }
}
