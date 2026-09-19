import { calculatorPath, getCalculatorBySlug } from "./registry";

export type FeaturedCalculator = {
  /** Julkinen URL-slug (voi olla SEO-alias, esim. kattoremontti) */
  hrefSlug: string;
  label: string;
  emoji: string;
  priceHint: string;
  blurb: string;
};

/** Suosituimmat laskurit — etusivu ja /laskurit -hero. */
export const FEATURED_CALCULATORS: readonly FeaturedCalculator[] = [
  {
    hrefSlug: "kattoremontti",
    label: "Kattoremontin laskuri",
    emoji: "🏠",
    priceHint: "16 000–20 000 €",
    blurb: "Purku, kate, rännit ja työt — omakotitalon kattoremontti.",
  },
  {
    hrefSlug: "ilmalampopumppu",
    label: "Ilmalämpöpumpun hinta-arvio",
    emoji: "❄️",
    priceHint: "1 700–3 500 €",
    blurb: "Laite, perusasennus, lisäputket ja sähkötyöt.",
  },
  {
    hrefSlug: "kylpyhuoneremontti",
    label: "Kylpyhuoneremontin laskuri",
    emoji: "🚿",
    priceHint: "6 000–15 000 €",
    blurb: "Purku, vesieristys, laatoitus, LVI ja kalusteet.",
  },
  {
    hrefSlug: "keittioremontti",
    label: "Keittiöremontin laskuri",
    emoji: "🍳",
    priceHint: "10 000–40 000 €",
    blurb: "Kalusteet, kodinkoneet, työt ja putki/sähkö.",
  },
  {
    hrefSlug: "maalaus",
    label: "Maalauslaskuri",
    emoji: "🎨",
    priceHint: "20–45 €/m²",
    blurb: "Sisä- ja ulkomaalaus, pohjatyöt ja tarvikkeet.",
  },
  {
    hrefSlug: "terassi",
    label: "Terassilaskuri",
    emoji: "🪵",
    priceHint: "4 000–8 000 €",
    blurb: "Perustukset, runko, lattia ja kaiteet.",
  },
] as const;

export function featuredCalculatorHref(hrefSlug: string): string {
  return calculatorPath(hrefSlug);
}

export function isFeaturedCalculatorAvailable(hrefSlug: string): boolean {
  return getCalculatorBySlug(hrefSlug) != null;
}

export function availableFeaturedCalculators(): FeaturedCalculator[] {
  return FEATURED_CALCULATORS.filter((f) => isFeaturedCalculatorAvailable(f.hrefSlug));
}
