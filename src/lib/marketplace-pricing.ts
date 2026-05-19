/** Torin (laitteiden ja varaosien) hinnasto — laskutus manuaalisesti. */

import { marketplaceBrand } from "@/lib/marketplace-brand";

export const MARKETPLACE_INVOICE_EMAIL = "laskutus@remonttireitti.fi";

export const CONSUMER_FREE_MAX_ACTIVE_LISTINGS = 2;

/** Julkaistun ilmoituksen näkyvyys (automaattinen vanhentuminen). */
export const LISTING_DURATION_WEEKS = 4;

export const LISTING_DURATION_DAYS = {
  paid: LISTING_DURATION_WEEKS * 7,
  consumer: LISTING_DURATION_WEEKS * 7,
} as const;

export type MarketplacePlanSlug =
  | "consumer_free"
  | "contractor_basic"
  | "contractor_pro"
  | "listing_single";

export type PricingPlan = {
  slug: MarketplacePlanSlug;
  name: string;
  priceLabel: string;
  priceEurCents: number;
  period?: string;
  listingQuota?: number;
  features: string[];
  cta: string;
  audience: "consumer" | "contractor";
  highlighted?: boolean;
};

export const CONTRACTOR_PLANS: PricingPlan[] = [
  {
    slug: "contractor_basic",
    name: "Perus",
    priceLabel: "49 €",
    priceEurCents: 4900,
    period: "/ kk (+ ALV)",
    listingQuota: 3,
    features: [
      "3 aktiivista ilmoitusta kerrallaan",
      "Käytetyt ja uudet laitteet",
      "Näkyy urakoitsijoiden markkinapaikalla",
      "Lasku sähköpostiin",
    ],
    cta: "Tilaa Perus",
    audience: "contractor",
  },
  {
    slug: "contractor_pro",
    name: "Pro",
    priceLabel: "99 €",
    priceEurCents: 9900,
    period: "/ kk (+ ALV)",
    listingQuota: 10,
    features: [
      "10 aktiivista ilmoitusta kerrallaan",
      "Korostus hakutuloksissa (tulossa)",
      "Sopii vaihtajille ja tukkureille",
      "Lasku sähköpostiin kuukausittain",
    ],
    cta: "Tilaa Pro",
    audience: "contractor",
    highlighted: true,
  },
];

export const LISTING_SINGLE: PricingPlan = {
  slug: "listing_single",
  name: "Yksittäinen ilmoitus",
  priceLabel: "29 €",
  priceEurCents: 2900,
  period: `/ ${LISTING_DURATION_WEEKS} vk (+ ALV)`,
  features: [
    "Yksi ilmoitus ilman kuukausitilausta",
    `${LISTING_DURATION_WEEKS} viikon näkyvyys`,
    "Hyvä kertamyyntiin tai varastoerään",
  ],
  cta: "Julkaise yksittäisellä ilmoituksella",
  audience: "contractor",
};

export const CONSUMER_FREE_PLAN: PricingPlan = {
  slug: "consumer_free",
  name: "Yksityiselle ilmaiseksi",
  priceLabel: "0 €",
  priceEurCents: 0,
  listingQuota: CONSUMER_FREE_MAX_ACTIVE_LISTINGS,
  features: [
    "Käytetyt lämpöpumput, osat ja tarvikkeet",
    `Enintään ${CONSUMER_FREE_MAX_ACTIVE_LISTINGS} aktiivista ilmoitusta`,
    `${LISTING_DURATION_WEEKS} viikon näkyvyys — voit poistaa ilmoituksen milloin tahansa`,
    "Ei kuukausimaksua eikä ilmoitusmaksua",
    "Yhteystiedot näkyvät ostajille julkaisun jälkeen",
  ],
  cta: "Ilmoita myytävä laite",
  audience: "consumer",
};

export const PRICING_FAQ = [
  {
    q: "Miten maksu toimii?",
    a: "Lähetämme laskun sähköpostitse. Ilmoitukset ja tilauspaketit aktivoituvat, kun maksu on kirjattu (yleensä 1–2 arkipäivää).",
  },
  {
    q: "Miksi kuluttajalle on ilmainen?",
    a: `Haluamme lisätä tarjontaa ${marketplaceBrand.name.toLowerCase()}lle. Ammattilaiset maksavat näkyvyydestä ja suuremmasta ilmoitusmäärästä kuukausi- tai ilmoitusmaksulla.`,
  },
  {
    q: "Voiko urakoitsija myydä ilman kk-tilausta?",
    a: `Kyllä. Voit ostaa yksittäisen ${LISTING_DURATION_WEEKS} viikon ilmoituksen (29 € + ALV) tai valita kuukausipaketin, jos julkaiset useammin.`,
  },
  {
    q: "Kuinka kauan ilmoitus on näkyvissä?",
    a: `Julkaistu ilmoitus on torilla ${LISTING_DURATION_WEEKS} viikkoa, ellei poista sitä aiemmin. Vanhentuneet ilmoitukset piilotetaan automaattisesti.`,
  },
  {
    q: "Mitä saan tarjouskilpailun välitysmaksun lisäksi?",
    a: `Tarjouskilpailu ja ${marketplaceBrand.name.toLowerCase()} ovat erillisiä palveluita. Tarjouksen hyväksynnän välitysmaksu avaa asiakkaan yhteystiedot urakalle; tori on laitteiden ja varaosien myyntiin.`,
  },
] as const;

export function formatPriceFromCents(cents: number): string {
  if (cents === 0) return "0 €";
  return new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
