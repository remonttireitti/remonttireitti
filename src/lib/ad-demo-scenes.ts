export type AdDemoFormat = "pysty" | "vaaka";

export type AdDemoAudience = "asiakas" | "urakoitsija";

export type AdSceneVisual =
  | "hook-problem"
  | "hook-work"
  | "logo"
  | "guided-form"
  | "compare-bids"
  | "free-badge"
  | "quality-request"
  | "submit-bid"
  | "area-map"
  | "cta-customer"
  | "cta-contractor";

export type AdScene = {
  id: string;
  durationMs?: number;
  headline: string;
  subline?: string;
  visual: AdSceneVisual;
};

export const AD_DEMO_TOTAL_MS = 30_000;

export const customerAdScenes: AdScene[] = [
  {
    id: "hook",
    headline: "Remontti edessä — mistä aloittaa?",
    visual: "hook-problem",
  },
  {
    id: "brand",
    headline: "Remonttireitti",
    subline: "Remontin kilpailutus yhdessä paikassa.",
    visual: "logo",
  },
  {
    id: "form",
    headline: "Ohjattu tarjouspyyntö",
    subline: "Selkeä kuvaus ilman arvailua.",
    visual: "guided-form",
  },
  {
    id: "compare",
    headline: "Vertaa tarjouksia",
    subline: "Sama muoto — tingaa tarvittaessa.",
    visual: "compare-bids",
  },
  {
    id: "free",
    headline: "Asiakkaalle 0 €",
    subline: "Pyyntö, vertailu ja valinta ilmaiseksi.",
    visual: "free-badge",
  },
  {
    id: "cta",
    headline: "Kilpailuta remontti",
    subline: "remonttireitti.fi",
    visual: "cta-customer",
  },
];

export const contractorAdScenes: AdScene[] = [
  {
    id: "hook",
    headline: "Etsitkö seuraavaa urakkaa?",
    visual: "hook-work",
  },
  {
    id: "brand",
    headline: "Remonttireitti",
    subline: "Tarjouspyynnöt suoraan eteesi.",
    visual: "logo",
  },
  {
    id: "quality",
    headline: "Selkeät pyynnöt",
    subline: "Asiakas kuvaa työn valmiiksi — vähemmän arvailua.",
    visual: "quality-request",
  },
  {
    id: "bid",
    headline: "Tarjous ilmaiseksi",
    subline: "Maksat vain voitetusta diilistä.",
    visual: "submit-bid",
  },
  {
    id: "area",
    headline: "Sopivat työt alueeltasi",
    subline: "Ei turhaa työnhakua.",
    visual: "area-map",
  },
  {
    id: "cta",
    headline: "Liity urakoitsijaksi",
    subline: "remonttireitti.fi/urakoitsijaksi",
    visual: "cta-contractor",
  },
];

export function parseAdDemoFormat(value: string | undefined): AdDemoFormat {
  return value === "vaaka" ? "vaaka" : "pysty";
}
