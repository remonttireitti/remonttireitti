import { HEAT_PUMP_JOB_SLUGS, type HeatPumpSlug } from "@/constants/heat-pumps";

/**
 * Julkaistut remonttityypit — järjestys kysynnän mukaan (Suomi, omakotitalo).
 * DB:ssä olemassa olevat job_types.slug-arvot.
 */
export const PUBLIC_PROJECT_JOB_SLUGS = [
  // Lämmitys — vahvin erottuvuus, syvä lomake
  "ilmalampopumppu",
  "ilmavesilampopumppu",
  "maalampopumppu",
  // Sähkö & energia — kasvava kysyntä
  "latauspiste",
  "aurinkopaneelit",
  "sahko-keskus",
  // LVI & ilma
  "ilmanvaihto-kone",
  "kayttovesi",
  "vesivahinko",
  // Sisätilat — perinteiset remontit
  "kylpyhuone",
  "keittio",
  "wc-remontti",
  // Ulkokuori
  "ikkunat",
  "katto-pelti",
  "ulkomaalaus",
  // Perustus
  "sokkeli",
  // Piha
  "terassi",
] as const;

export type PublicProjectJobSlug = (typeof PUBLIC_PROJECT_JOB_SLUGS)[number];

export type ProjectAreaSlug =
  | "lammitys"
  | "sahko-energia"
  | "lvi-ilma"
  | "sisatilat"
  | "ulkokuori"
  | "perustus-runko"
  | "piha";

export type ProjectArea = {
  slug: ProjectAreaSlug;
  title: string;
  description: string;
  jobSlugs: readonly PublicProjectJobSlug[];
};

/** Talon osittainen jako — mitä remonttia tarvitset? */
export const PROJECT_AREAS: readonly ProjectArea[] = [
  {
    slug: "lammitys",
    title: "Lämmitys & jäähdytys",
    description: "Lämpöpumput — tarkka asennuslomake ja vian selvitys.",
    jobSlugs: HEAT_PUMP_JOB_SLUGS,
  },
  {
    slug: "sahko-energia",
    title: "Sähkö & energia",
    description: "Lataus, aurinkosähkö ja sähkökeskus.",
    jobSlugs: ["latauspiste", "aurinkopaneelit", "sahko-keskus"],
  },
  {
    slug: "lvi-ilma",
    title: "LVI & ilmanvaihto",
    description: "Putket, ilmanvaihto ja vesivahinko.",
    jobSlugs: ["ilmanvaihto-kone", "kayttovesi", "vesivahinko"],
  },
  {
    slug: "sisatilat",
    title: "Sisätilat",
    description: "Kylpyhuone, keittiö ja wc.",
    jobSlugs: ["kylpyhuone", "keittio", "wc-remontti"],
  },
  {
    slug: "ulkokuori",
    title: "Ulkokuori",
    description: "Ikkunat, katto ja ulkomaalaus.",
    jobSlugs: ["ikkunat", "katto-pelti", "ulkomaalaus"],
  },
  {
    slug: "perustus-runko",
    title: "Perustus & runko",
    description: "Sokkeli, salaojitus ja eristys.",
    jobSlugs: ["sokkeli"],
  },
  {
    slug: "piha",
    title: "Piha & ulko",
    description: "Terassi ja pihatyöt.",
    jobSlugs: ["terassi"],
  },
] as const;

export function isHeatPumpJobSlug(slug: string): slug is HeatPumpSlug {
  return (HEAT_PUMP_JOB_SLUGS as readonly string[]).includes(slug);
}

export function areaForJobSlug(slug: string): ProjectArea | null {
  return PROJECT_AREAS.find((a) => a.jobSlugs.includes(slug as PublicProjectJobSlug)) ?? null;
}

/** Yleislomakkeen ohje kuvaus-kenttään. */
export const GENERIC_PROJECT_DESCRIPTION_HINTS: Partial<
  Record<PublicProjectJobSlug, string>
> = {
  latauspiste:
    "Kerro autosta, parkkipaikasta, etäisyydestä sähkökeskukseen ja toiveista (esim. 11 kW lataus)…",
  aurinkopaneelit:
    "Kerro katon suunnasta, koko arviosta, nykyisestä sähkökeskuksesta ja toiveista…",
  "sahko-keskus":
    "Kerro talon iästä, nykyisestä keskuksesa, sulakkeista ja miksi uusinta tarvitaan…",
  "ilmanvaihto-kone":
    "Kerro nykyisestä ilmanvaihdosta, asunnon koosta ja ongelmista (kosteus, veto, melu)…",
  kayttovesi:
    "Kerro putkiston iästä, materiaalista (kupari/muovi) ja mitä haluat uusia…",
  vesivahinko:
    "Kerro milloin havaittiin, missä vuotaa/kosteutta ja mitä on jo tehty…",
  kylpyhuone:
    "Kerro kylpyhuoneen koosta, nykytilasta, toiveista (suihku/amme, laatoitus) ja aikataulusta…",
  keittio:
    "Kerro keittiön koosta, nykyisistä kaapeista, kodinkoneista ja toiveista…",
  "wc-remontti":
    "Kerro wc:n koosta, laatoituksesta ja mitä uusitaan (istuin, putket, pinta)…",
  ikkunat:
    "Kerro ikkunoiden määrästä, tyypistä (puu/muovi/alumiini), kohteesta ja energiatoiveista…",
  "katto-pelti":
    "Kerro katon materiaalista, iästä, vuodoista ja näkyvistä vaurioista…",
  ulkomaalaus:
    "Kerro pinta-alasta, nykyisestä pinnasta (puu/rapattu) ja toivotusta ajasta…",
  sokkeli:
    "Kerro kosteudesta, halkeamista, salaojituksesta tai routaeristeestä…",
  terassi:
    "Kerro terassin koosta, materiaalitoiveesta ja maastosta…",
};

export function genericDescriptionPlaceholder(jobSlug: string | null): string {
  if (jobSlug && jobSlug in GENERIC_PROJECT_DESCRIPTION_HINTS) {
    return GENERIC_PROJECT_DESCRIPTION_HINTS[jobSlug as PublicProjectJobSlug]!;
  }
  return "Kerro kohteesta, nykytilasta, toiveista ja aikataulusta…";
}
