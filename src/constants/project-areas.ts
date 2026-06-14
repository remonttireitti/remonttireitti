import { HEAT_PUMP_JOB_SLUGS, type HeatPumpSlug } from "@/constants/heat-pumps";

/**
 * Julkaistut remonttityypit — järjestys kysynnän mukaan (Suomi, omakotitalo).
 * DB:ssä olemassa olevat job_types.slug-arvot.
 */
export const PUBLIC_PROJECT_JOB_SLUGS = [
  // Lämmitys
  "ilmalampopumppu",
  "ilmavesilampopumppu",
  "maalampopumppu",
  "lammitys-vaihto",
  // Sähkö & energia
  "latauspiste",
  "aurinkopaneelit",
  "sahkokeskus",
  "sahko-lisays",
  "ulko-valaistus",
  // LVI & ilma
  "ilmanvaihto-kone",
  "ilmanvaihto-puhdistus",
  "kayttovesi",
  "viemari",
  "vesivahinko",
  // Sisätilat
  "kylpyhuone",
  "keittio",
  "wc-remontti",
  "sauna",
  "lattia-sisä",
  "seinamaalaus",
  "laatoitus-sisa",
  // Ulkokuori
  "ikkunat",
  "ovet-ulko",
  "katto-pelti",
  "rannit",
  "ulkomaalaus",
  "julkisivu-verhous",
  "julkisivu-rapaus",
  // Perustus & runko
  "sokkeli",
  "perustus",
  "vaihe-eriste",
  // Piha
  "terassi",
  "pihatie",
  "aita",
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
    description: "Lämpöpumput ja lämmitysjärjestelmän uusiminen.",
    jobSlugs: [...HEAT_PUMP_JOB_SLUGS, "lammitys-vaihto"],
  },
  {
    slug: "sahko-energia",
    title: "Sähkö & energia",
    description: "Lataus, aurinkosähkö, sähkökeskus ja valaistus.",
    jobSlugs: [
      "latauspiste",
      "aurinkopaneelit",
      "sahkokeskus",
      "sahko-lisays",
      "ulko-valaistus",
    ],
  },
  {
    slug: "lvi-ilma",
    title: "LVI & ilmanvaihto",
    description: "Putket, ilmanvaihto ja vesivahinko.",
    jobSlugs: [
      "ilmanvaihto-kone",
      "ilmanvaihto-puhdistus",
      "kayttovesi",
      "viemari",
      "vesivahinko",
    ],
  },
  {
    slug: "sisatilat",
    title: "Sisätilat",
    description: "Keittiö, kylpyhuone, sauna ja pinnat.",
    jobSlugs: [
      "kylpyhuone",
      "keittio",
      "wc-remontti",
      "sauna",
      "lattia-sisä",
      "seinamaalaus",
      "laatoitus-sisa",
    ],
  },
  {
    slug: "ulkokuori",
    title: "Ulkokuori",
    description: "Ikkunat, katto, julkisivu ja ulkomaalaus.",
    jobSlugs: [
      "ikkunat",
      "ovet-ulko",
      "katto-pelti",
      "rannit",
      "ulkomaalaus",
      "julkisivu-verhous",
      "julkisivu-rapaus",
    ],
  },
  {
    slug: "perustus-runko",
    title: "Perustus & runko",
    description: "Sokkeli, perustus ja eristys.",
    jobSlugs: ["sokkeli", "perustus", "vaihe-eriste"],
  },
  {
    slug: "piha",
    title: "Piha & ulko",
    description: "Terassi, pihatie ja aidat.",
    jobSlugs: ["terassi", "pihatie", "aita"],
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
  "lammitys-vaihto":
    "Kerro nykyisestä lämmityksestä, talon koosta ja toiveista (pumppu, patterit, lattialämmitys)…",
  latauspiste:
    "Kerro autosta, parkkipaikasta, etäisyydestä sähkökeskukseen ja toiveista (esim. 11 kW lataus)…",
  aurinkopaneelit:
    "Kerro katon suunnasta, koko arviosta, nykyisestä sähkökeskuksesta ja toiveista…",
  sahkokeskus:
    "Kerro talon iästä, nykyisestä keskuksesa, sulakkeista ja miksi uusinta tarvitaan…",
  "sahko-lisays":
    "Kerro montako pistettä tarvitaan, missä huoneissa ja mihin käyttöön…",
  "ulko-valaistus":
    "Kerro pihan, polun tai seinän valaistuksesta ja toiveista…",
  "ilmanvaihto-kone":
    "Kerro nykyisestä ilmanvaihdosta, asunnon koosta ja ongelmista (kosteus, veto, melu)…",
  "ilmanvaihto-puhdistus":
    "Kerro asunnon koosta, viimeisestä puhdistuksesta ja havaitsemistasi ongelmista…",
  kayttovesi:
    "Kerro putkiston iästä, materiaalista (kupari/muovi) ja mitä haluat uusia…",
  viemari:
    "Kerro oireista (haju, hidas viemäri, vuoto) ja talon iästä…",
  vesivahinko:
    "Kerro milloin havaittiin, missä vuotaa/kosteutta ja mitä on jo tehty…",
  kylpyhuone:
    "Kerro kylpyhuoneen koosta, nykytilasta, toiveista (suihku/amme, laatoitus) ja aikataulusta…",
  keittio:
    "Kerro keittiön koosta, nykyisistä kaapeista, kodinkoneista ja toiveista…",
  "wc-remontti":
    "Kerro wc:n koosta, laatoituksesta ja mitä uusitaan (istuin, putket, pinta)…",
  sauna:
    "Kerro nykytilasta, koko toiveesta (sähkökiuas, puusauna) ja aikataulusta…",
  "lattia-sisä":
    "Kerro huoneista, pinta-alasta ja materiaalitoiveesta (parketti, laminaatti, laatta)…",
  seinamaalaus:
    "Kerro huoneista, pintojen tilasta ja toivotusta ajasta…",
  "laatoitus-sisa":
    "Kerro tilasta, laatoitusalasta ja toiveista…",
  ikkunat:
    "Kerro ikkunoiden määrästä, tyypistä (puu/muovi/alumiini), kohteesta ja energiatoiveista…",
  "ovet-ulko":
    "Kerro oven tyypistä (etuovi, terassi, autotalli), mitat arviosta ja nykytilasta…",
  "katto-pelti":
    "Kerro katon materiaalista, iästä, vuodoista ja näkyvistä vaurioista…",
  rannit:
    "Kerro rännien ja kourujen kunnosta, korkeudesta ja materiaalista…",
  ulkomaalaus:
    "Kerro pinta-alasta, nykyisestä pinnasta (puu/rapattu) ja toivotusta ajasta…",
  "julkisivu-verhous":
    "Kerro julkisivun nykytilasta ja verhoustoiveista…",
  "julkisivu-rapaus":
    "Kerro halkeamista, rapauksen tilasta ja toiveista…",
  sokkeli:
    "Kerro kosteudesta, halkeamista, salaojituksesta tai routaeristeestä…",
  perustus:
    "Kerro perustustyön laajuudesta, syystä ja aikataulusta…",
  "vaihe-eriste":
    "Kerro eristettävästä kohdasta (yläpohja, välipohja) ja nykytilasta…",
  terassi:
    "Kerro terassin koosta, materiaalitoiveesta ja maastosta…",
  pihatie:
    "Kerro pinta-alasta, käyttötarkoituksesta ja maastosta…",
  aita:
    "Kerro aidan pituudesta, korkeudesta ja materiaalitoiveesta…",
};

export function genericDescriptionPlaceholder(jobSlug: string | null): string {
  if (jobSlug && jobSlug in GENERIC_PROJECT_DESCRIPTION_HINTS) {
    return GENERIC_PROJECT_DESCRIPTION_HINTS[jobSlug as PublicProjectJobSlug]!;
  }
  return "Kerro kohteesta, nykytilasta, toiveista ja aikataulusta…";
}
