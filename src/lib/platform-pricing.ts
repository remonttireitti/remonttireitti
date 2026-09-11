/**
 * Tarjouskilpailun hinnoittelu urakoitsijalle.
 *
 * Kaksi vaihtoehtoa:
 * 1. Kuukausitilaus — kiinteä kk-maksu, ei per-diili -palkkiota (halvempi aktiiviselle).
 * 2. Maksu per diili — maksat vain kun asiakas hyväksyy tarjouksesi (kallein).
 */

import {
  B2B_PRICE_VAT_NOTE,
  PAY_PER_DEAL_FEE_CENTS,
  formatPlatformFee,
} from "@/lib/platform-fee";

export const PLATFORM_INVOICE_EMAIL = "laskutus@remonttireitti.fi";

export { PAY_PER_DEAL_FEE_CENTS };

export type PlatformSubscriptionSlug =
  | "platform_1m"
  | "platform_3m"
  | "platform_6m"
  | "platform_12m";

export type PlatformSubscriptionPlan = {
  slug: PlatformSubscriptionSlug;
  name: string;
  months: number;
  /** Kokonaishinta koko jaksolle, veroton sentteinä. */
  totalCents: number;
  /** Kuukausihinta (laskettu), veroton sentteinä. */
  monthlyCents: number;
  savingsLabel?: string;
  highlighted?: boolean;
};

export const PLATFORM_SUBSCRIPTION_PLANS: PlatformSubscriptionPlan[] = [
  {
    slug: "platform_1m",
    name: "1 kk",
    months: 1,
    totalCents: 5900,
    monthlyCents: 5900,
  },
  {
    slug: "platform_3m",
    name: "3 kk",
    months: 3,
    totalCents: 14700,
    monthlyCents: 4900,
    savingsLabel: "Säästät 30 € vs. kuukausittain",
  },
  {
    slug: "platform_6m",
    name: "6 kk",
    months: 6,
    totalCents: 26400,
    monthlyCents: 4400,
    savingsLabel: "Säästät 90 € vs. kuukausittain",
  },
  {
    slug: "platform_12m",
    name: "12 kk",
    months: 12,
    totalCents: 46800,
    monthlyCents: 3900,
    savingsLabel: "Säästät 240 € vs. kuukausittain",
    highlighted: true,
  },
];

export const PLATFORM_PRICING_FAQ = [
  {
    q: "Kumpi malli minulle?",
    a: "Jos voitat keskimäärin 1–2 diiliä kuukaudessa, maksu per diili voi olla edullisempaa. Jos tarjoat aktiivisesti tai voitat useammin, kuukausitilaus on yleensä halvempi.",
  },
  {
    q: "Maksanko jotain, jos en voita?",
    a: "Et. Tarjouksen jättäminen on ilmainen. Maksat vain kuukausitilauksen (ennakko) tai per-diili -palkkion, kun asiakas hyväksyy tarjouksesi.",
  },
  {
    q: "Voinko vaihtaa mallia?",
    a: "Kyllä. Voit tilata kuukausijakson milloin tahansa — tilaus katkaisee per-diili -laskutuksen voimassaolon ajaksi. Jakson päätyttyä voit jatkaa tilausta tai palata maksuun per diili.",
  },
  {
    q: "Mitä beta-etu tarkoittaa?",
    a: "Ensimmäiset hyväksytyt diilit voivat olla ilman per-diili -palkkiota (maksu per diili -mallissa). Kuukausitilauksessa ei per-diili -maksuja lainkaan.",
  },
] as const;

export function formatSubscriptionPrice(plan: PlatformSubscriptionPlan): string {
  if (plan.months === 1) {
    return `${formatPlatformFee(plan.monthlyCents)}/kk`;
  }
  return `${formatPlatformFee(plan.totalCents)} / ${plan.months} kk`;
}

export function formatSubscriptionMonthly(plan: PlatformSubscriptionPlan): string {
  return `${formatPlatformFee(plan.monthlyCents)}/kk`;
}

export function payPerDealPriceLabel(): string {
  return `${formatPlatformFee(PAY_PER_DEAL_FEE_CENTS)} / hyväksytty diili`;
}

export function platformPricingVatNote(): string {
  return `${B2B_PRICE_VAT_NOTE} Hinnat verottomia; ALV lisätään laskulle.`;
}

export function getPlatformSubscriptionPlan(
  slug: string,
): PlatformSubscriptionPlan | undefined {
  return PLATFORM_SUBSCRIPTION_PLANS.find((p) => p.slug === slug);
}
