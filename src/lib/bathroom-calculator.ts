/** Kylpyhuoneremontin hintalaskurin oletusarvot (suomalaiset keskiarvot, 2026). */

export type TileTier = "perus" | "premium";

export type CostUnit = "per_sqm" | "fixed";

export type CalculatorLineItem = {
  id: string;
  label: string;
  description: string;
  unit: CostUnit;
  /** €/lattia-m² tai kiinteä € */
  amount: number;
  minAmount?: number;
  enabled: boolean;
  /** Vain näyttö: Google-hakuehdotus materiaalihintojen tarkistukseen */
  searchHint?: string;
  custom?: boolean;
};

export const DEFAULT_FLOOR_SQM = 5;

export const TILE_TIER_AMOUNTS: Record<TileTier, number> = {
  perus: 250,
  premium: 500,
};

/** Oletusrivit — käyttäjä voi muokata, poistaa tai lisätä omia. */
export function defaultCalculatorLineItems(tileTier: TileTier): CalculatorLineItem[] {
  return [
    {
      id: "purku",
      label: "Purkutyöt ja jätehuolto",
      description: "Vanhojen kalusteiden, laattojen ja mahdollisten valujen purku sekä jätemaksut.",
      unit: "per_sqm",
      amount: 200,
      minAmount: 1000,
      enabled: true,
      searchHint: "kylpyhuoneen purkutyöt hinta",
    },
    {
      id: "vesieristys",
      label: "Vesieristys ja pohjatyöt",
      description: "Seinien ja lattian suoristus, tasoitus sekä sertifioitu vesieristys.",
      unit: "per_sqm",
      amount: 300,
      enabled: true,
      searchHint: "kylpyhuoneen vesieristys hinta neliö",
    },
    {
      id: "laatoitus-tyo",
      label: "Laatoitustyö",
      description: "Seinien ja lattian laatoitus sekä saumaustyöt (työn osuus).",
      unit: "per_sqm",
      amount: 400,
      enabled: true,
      searchHint: "laatoitus työ hinta neliö",
    },
    {
      id: "laatat",
      label: "Laatat ja pintamateriaalit",
      description: "Laatat, kiinnityslaastit ja sauma-aineet (materiaalien osuus).",
      unit: "per_sqm",
      amount: TILE_TIER_AMOUNTS[tileTier],
      enabled: true,
      searchHint: "kylpyhuone laatta hinta eur neliö",
    },
    {
      id: "lvi-sahko",
      label: "LVI- ja sähkötyöt",
      description: "Putkien linjaukset, lattiakaivo, hanat, suihku ja valaistus (ammattilainen).",
      unit: "fixed",
      amount: 2500,
      enabled: true,
      searchHint: "kylpyhuone putkityöt hinta",
    },
    {
      id: "kalusteet",
      label: "Kalusteet",
      description: "Allas, kaapit, wc-istuin ja hanat (hankintahinta, ei asennusta).",
      unit: "fixed",
      amount: 1500,
      enabled: true,
      searchHint: "kylpyhuonekalusteet hinta",
    },
  ];
}

export type CalculatedLine = {
  id: string;
  label: string;
  amount: number;
  enabled: boolean;
};

export function lineItemTotal(
  item: CalculatorLineItem,
  floorSqm: number,
): number {
  if (!item.enabled) return 0;
  if (item.unit === "fixed") return Math.round(item.amount);
  const raw = item.amount * floorSqm;
  if (item.minAmount != null) return Math.round(Math.max(item.minAmount, raw));
  return Math.round(raw);
}

export function calculateBathroomEstimate(
  floorSqm: number,
  items: CalculatorLineItem[],
): { lines: CalculatedLine[]; total: number } {
  const sqm = Math.max(1, Math.min(30, floorSqm));
  const lines = items.map((item) => ({
    id: item.id,
    label: item.label,
    amount: lineItemTotal(item, sqm),
    enabled: item.enabled,
  }));
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, total };
}

/** Tyypillinen 5 m² jaon prosentit (visualisointi ennen laskentaa). */
export const TYPICAL_BREAKDOWN_5SQM = [
  { label: "Purkutyöt", amount: 1000, color: "bg-stone-400" },
  { label: "Vesieristys", amount: 1500, color: "bg-sky-500" },
  { label: "Laatoitustyö", amount: 2000, color: "bg-sky-700" },
  { label: "Laatat", amount: 1250, color: "bg-orange-400" },
  { label: "LVI ja sähkö", amount: 2500, color: "bg-orange-600" },
  { label: "Kalusteet", amount: 1500, color: "bg-amber-500" },
] as const;

export function googlePriceSearch(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function formatEuro(amount: number): string {
  return `${amount.toLocaleString("fi-FI")} €`;
}

export function newCustomLineItem(): CalculatorLineItem {
  return {
    id: `custom-${Date.now()}`,
    label: "Oma kulu",
    description: "",
    unit: "fixed",
    amount: 0,
    enabled: true,
    custom: true,
  };
}
