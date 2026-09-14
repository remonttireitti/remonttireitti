import {
  areaForJobSlug,
  type ProjectAreaSlug,
  type PublicProjectJobSlug,
} from "@/constants/project-areas";
import { HEAT_PUMP_JOB_SLUGS } from "@/constants/heat-pumps";

export type RequestGuideQuestion = {
  id: string;
  question: string;
  hint: string;
  /** Avainsanoja kuvauksessa — jos löytyy, kysymys katsotaan vastatuksi. */
  keywords?: string[];
  /** Teksti, joka lisätään kuvaukseen napista. */
  promptLine: string;
};

export type RequestQualityCriterion = {
  id: string;
  label: string;
  tip: string;
  weight: number;
  keywords?: string[];
};

export type ProjectRequestTemplate = {
  areaSlug: ProjectAreaSlug | "generic";
  title: string;
  intro: string;
  questions: RequestGuideQuestion[];
  qualityCriteria: RequestQualityCriterion[];
};

const HEAT_PUMP_TEMPLATE: ProjectRequestTemplate = {
  areaSlug: "lammitys",
  title: "Lämpöpumpun tarjouspyyntö",
  intro:
    "Hyvä tarjouspyyntö kertoo kohteen, nykyisen lämmityksen ja asennuspaikan. Näin urakoitsija voi arvioida työn oikein.",
  questions: [
    {
      id: "hp_property",
      question: "Minkä tyyppinen rakennus ja kuinka suuri tila lämmitetään?",
      hint: "Esim. omakotitalo 120 m², yksi kerros.",
      keywords: ["m²", "m2", "omakoti", "rivitalo", "kerros"],
      promptLine: "Kohde: [rakennustyyppi], lämmitettävä alue n. ___ m².",
    },
    {
      id: "hp_current",
      question: "Mikä on nykyinen lämmitystapa?",
      hint: "Sähkö, öljy, puu, kaukolämpö…",
      keywords: ["sähkö", "öljy", "puu", "kaukolämpö", "patteri", "lattialämmitys"],
      promptLine: "Nykyinen lämmitys: ___.",
    },
    {
      id: "hp_location",
      question: "Missä sisä- ja ulkoyksikkö voisi sijaita?",
      hint: "Kerro etäisyys, korkeus, seinämateriaali.",
      keywords: ["ulkoyksikk", "sisäyksikk", "asennuspaik", "seinä", "pihalla"],
      promptLine: "Asennuspaikka: sisäyksikkö ___, ulkoyksikkö ___, putkimatka arvio n. ___ m.",
    },
    {
      id: "hp_scope",
      question: "Haluatko vain asennuksen vai laitteen mukana?",
      hint: "Omat laitteet vs. avaimet käteen.",
      keywords: ["asennus", "laite", "toimitus", "avaimet"],
      promptLine: "Toivottu laajuus: [vain asennus / laite + asennus].",
    },
    {
      id: "hp_schedule",
      question: "Milloin työ voisi alkaa?",
      hint: "Kiireellinen / joustava / tietty kuukausi.",
      keywords: ["aloitus", "aikataulu", "kuukaus", "viikko", "kiire"],
      promptLine: "Toivottu aloitus: ___.",
    },
  ],
  qualityCriteria: [
    {
      id: "hp_area",
      label: "Lämmitettävä alue tai huoneet",
      tip: "Kerro pinta-ala tai mitkä tilat pumpulla katetaan.",
      weight: 15,
      keywords: ["m²", "m2", "m²", "huone"],
    },
    {
      id: "hp_heating",
      label: "Nykyinen lämmitys",
      tip: "Auttaa arvioimaan järjestelmän vaihtoa.",
      weight: 12,
      keywords: ["lämmitys", "sähkö", "öljy", "puu", "patteri"],
    },
    {
      id: "hp_install",
      label: "Asennuspaikka",
      tip: "Kuvaile sisä- ja ulkoyksikön paikka.",
      weight: 15,
      keywords: ["asennus", "ulkoyksikk", "sisäyksikk", "seinä"],
    },
    {
      id: "hp_budget",
      label: "Budjetti",
      tip: "Urakoitsijat voivat suodattaa tarjouksia.",
      weight: 10,
      keywords: ["budjetti", "€", "euro", "hinta"],
    },
    {
      id: "hp_photos",
      label: "Kuvat asennuspaikasta",
      tip: "Yksi kuva säästää usein yhden kysymyksen.",
      weight: 8,
    },
    {
      id: "hp_schedule",
      label: "Aikataulu",
      tip: "Milloin haluat työn alkavan?",
      weight: 10,
      keywords: ["aloitus", "aikataulu", "kuukaus"],
    },
  ],
};

const ROOF_TEMPLATE: ProjectRequestTemplate = {
  areaSlug: "ulkokuori",
  title: "Kattotyön tarjouspyyntö",
  intro:
    "Kerro katon materiaali, ikä, näkyvät vauriot ja toivottu lopputulos. Näin saat vertailukelpoisia tarjouksia.",
  questions: [
    {
      id: "roof_type",
      question: "Minkälainen katto on nyt?",
      hint: "Pelti, tiili, huopa, kate…",
      keywords: ["pelti", "tiili", "huopa", "kate", "räystäs"],
      promptLine: "Nykyinen katto: [materiaali], arvio ikä ___ vuotta.",
    },
    {
      id: "roof_issue",
      question: "Mitä ongelmia on havaittu?",
      hint: "Vuoto, ruoste, irronneet kattokattilaat, lumi…",
      keywords: ["vuoto", "vuot", "ruoste", "reikä", "vaurio", "lumi"],
      promptLine: "Havaitut ongelmat: ___.",
    },
    {
      id: "roof_area",
      question: "Kuinka suuri katto on?",
      hint: "Pinta-ala arvio tai mitta (m²).",
      keywords: ["m²", "m2", "pinta-ala", "neliö"],
      promptLine: "Katon pinta-ala arvio n. ___ m².",
    },
    {
      id: "roof_scope",
      question: "Koko uusinta vai osittainen korjaus?",
      hint: "Purku, eriste, kattoturva, rännit.",
      keywords: ["purku", "uusinta", "korjaus", "ränn", "eriste"],
      promptLine: "Toivottu laajuus: [koko kattoremontti / osittainen korjaus].",
    },
    {
      id: "roof_access",
      question: "Onko esteitä tai erityistä korkeutta?",
      hint: "Jyrkkyys, kerrokset, naapuritalo.",
      keywords: ["korkea", "jyrkk", "kerros", "teline", "turva"],
      promptLine: "Erityishuomiot (korkeus, pääsy): ___.",
    },
  ],
  qualityCriteria: [
    {
      id: "roof_material",
      label: "Katon materiaali ja ikä",
      tip: "Urakoitsija arvioi purku- ja asennustyön.",
      weight: 15,
      keywords: ["pelti", "tiili", "huopa", "kate"],
    },
    {
      id: "roof_problem",
      label: "Ongelma tai tavoite",
      tip: "Miksi remontti tehdään nyt?",
      weight: 15,
      keywords: ["vuoto", "vuot", "ruoste", "vaurio", "uusinta"],
    },
    {
      id: "roof_area",
      label: "Pinta-ala",
      tip: "Ilman pinta-alaa hinta-arvio on vaikea.",
      weight: 15,
      keywords: ["m²", "m2", "pinta-ala"],
    },
    {
      id: "roof_photos",
      label: "Kuvat katosta",
      tip: "Kuvat auttavat arvioimaan työn laajuutta.",
      weight: 12,
    },
    {
      id: "roof_schedule",
      label: "Aikataulu",
      tip: "Kesäkausi täyttyy nopeasti.",
      weight: 10,
      keywords: ["aloitus", "aikataulu", "kesä"],
    },
    {
      id: "roof_budget",
      label: "Budjetti",
      tip: "Auttaa sopivien urakoitsijoiden löytymistä.",
      weight: 8,
      keywords: ["budjetti", "€", "euro"],
    },
  ],
};

const LVI_TEMPLATE: ProjectRequestTemplate = {
  areaSlug: "lvi-ilma",
  title: "LVI- tai ilmanvaihtotyön tarjouspyyntö",
  intro:
    "Kuvaile nykytila, oireet ja toivottu lopputulos. Putki- ja ilmanvaihtotyössä yksityiskohdat vaikuttavat hintaan paljon.",
  questions: [
    {
      id: "lvi_symptom",
      question: "Mikä on ongelma tai tavoite?",
      hint: "Haju, kosteus, hidas viemäri, melu, veto…",
      keywords: ["haju", "kosteus", "viemäri", "vuoto", "melu", "veto"],
      promptLine: "Ongelma / tavoite: ___.",
    },
    {
      id: "lvi_age",
      question: "Taloyksen tai putkiston ikä?",
      hint: "Auttaa arvioimaan uusintaa vs. korjausta.",
      keywords: ["vuotta", "rakennettu", "vanha", "197", "198", "199", "200"],
      promptLine: "Rakennus / putkisto arvio: rakennettu ___, putkisto ___.",
    },
    {
      id: "lvi_scope",
      question: "Koko järjestelmä vai yksi kohta?",
      hint: "Yksi huone, koko talo, ilmanvaihtokone…",
      keywords: ["koko", "huone", "kone", "verkosto", "osa"],
      promptLine: "Työn laajuus: ___.",
    },
    {
      id: "lvi_access",
      question: "Pääsy kohteeseen ja mahdolliset purkutyöt?",
      hint: "Laattapurku, yläpohja, konehuone.",
      keywords: ["purku", "laatta", "yläpohja", "konehuone", "pääsy"],
      promptLine: "Pääsy ja purkutyöt: ___.",
    },
  ],
  qualityCriteria: [
    {
      id: "lvi_problem",
      label: "Ongelma kuvattu",
      tip: "Mitä pitää korjata tai uusia?",
      weight: 18,
      keywords: ["ongelma", "vuoto", "haju", "kosteus", "viemäri"],
    },
    {
      id: "lvi_scope",
      label: "Työn laajuus",
      tip: "Yksi piste vai koko talo?",
      weight: 15,
      keywords: ["koko", "huone", "järjestelm", "verkosto"],
    },
    {
      id: "lvi_photos",
      label: "Kuvat",
      tip: "Vuotokohdan tai nykytilan kuva.",
      weight: 10,
    },
    {
      id: "lvi_schedule",
      label: "Aikataulu",
      tip: "Kiireellisyys vaikuttaa resurssointiin.",
      weight: 10,
      keywords: ["aloitus", "aikataulu", "kiire"],
    },
    {
      id: "lvi_budget",
      label: "Budjetti",
      tip: "Valinnainen mutta hyödyllinen.",
      weight: 8,
      keywords: ["budjetti", "€"],
    },
  ],
};

const INTERIOR_TEMPLATE: ProjectRequestTemplate = {
  areaSlug: "sisatilat",
  title: "Sisätilaremontin tarjouspyyntö",
  intro:
    "Kerro tilan koko, nykytila ja toiveet. Erota halutessasi materiaalit ja työt.",
  questions: [
    {
      id: "int_room",
      question: "Mikä tila remontoidaan ja kuinka suuri se on?",
      hint: "Keittiö 12 m², kylpyhuone 6 m²…",
      keywords: ["m²", "m2", "keittiö", "kylpyhuone", "sauna", "wc"],
      promptLine: "Tila: ___, pinta-ala arvio n. ___ m².",
    },
    {
      id: "int_current",
      question: "Mikä on nykytila?",
      hint: "1970-luvun laatoitus, vanha keittiö, kosteus…",
      keywords: ["vanha", "laatoitus", "kosteus", "purku", "197", "198"],
      promptLine: "Nykytila: ___.",
    },
    {
      id: "int_wish",
      question: "Mitä toivot lopputulokseksi?",
      hint: "Materiaalit, kalusteet, sähkö, putket.",
      keywords: ["toive", "materiaali", "laatoitus", "kaappi", "suihku"],
      promptLine: "Toiveet: ___.",
    },
    {
      id: "int_scope",
      question: "Tarvitaanko putki- tai sähkötöitä?",
      hint: "Kokonaisurakka vs. pintaremontti.",
      keywords: ["putki", "sähkö", "LVI", "pintaremontti", "kokonais"],
      promptLine: "Tarvittavat ammattiryhmät: [pintatyöt / putki / sähkö].",
    },
  ],
  qualityCriteria: [
    {
      id: "int_size",
      label: "Tilan koko",
      tip: "Pinta-ala tai mitat.",
      weight: 15,
      keywords: ["m²", "m2", "pinta-ala"],
    },
    {
      id: "int_state",
      label: "Nykytila",
      tip: "Mitä puretaan pois?",
      weight: 15,
      keywords: ["nyky", "vanha", "purku", "laatoitus"],
    },
    {
      id: "int_wish",
      label: "Toiveet",
      tip: "Materiaalit ja lopputulos.",
      weight: 15,
      keywords: ["toive", "materiaali", "uusi"],
    },
    {
      id: "int_photos",
      label: "Kuvat",
      tip: "Nykytilan kuvat auttavat paljon.",
      weight: 12,
    },
    {
      id: "int_schedule",
      label: "Aikataulu",
      tip: "Milloin remontti voisi alkaa?",
      weight: 10,
      keywords: ["aloitus", "aikataulu"],
    },
  ],
};

const GENERIC_TEMPLATE: ProjectRequestTemplate = {
  areaSlug: "generic",
  title: "Tarjouspyyntö",
  intro:
    "Voit julkaista vähälläkin — kaikki kentät eivät ole pakollisia. Mitä selkeämmin kuvaat työn, sitä tarkempia tarjouksia yleensä saat.",
  questions: [
    {
      id: "gen_what",
      question: "Mitä työtä tarvitset?",
      hint: "Kuvaile selkeästi tavoite.",
      keywords: ["tarvitsen", "haluan", "remontti", "asennus", "korjaus"],
      promptLine: "Työn kuvaus: ___.",
    },
    {
      id: "gen_where",
      question: "Missä työ tehdään ja mikä on nykytila?",
      hint: "Huone, rakennus, ongelmat.",
      keywords: ["kohde", "huone", "rakennus", "nyky"],
      promptLine: "Kohde ja nykytila: ___.",
    },
  ],
  qualityCriteria: [
    {
      id: "gen_desc",
      label: "Selkeä kuvaus",
      tip: "Vähintään muutama lause työn sisällöstä.",
      weight: 25,
    },
    {
      id: "gen_context",
      label: "Nykytila ja tavoite",
      tip: "Miksi työ tehdään?",
      weight: 20,
      keywords: ["nyky", "ongelma", "toive", "tavoite"],
    },
    {
      id: "gen_schedule",
      label: "Aikataulu",
      tip: "Täytä toivottu aloitus kenttä kuvauksen alla (valinnainen).",
      weight: 15,
      keywords: ["aloitus", "aikataulu"],
    },
    {
      id: "gen_budget",
      label: "Budjetti",
      tip: "Täytä budjettikenttä kuvauksen alla (valinnainen).",
      weight: 10,
      keywords: ["budjetti", "€"],
    },
    {
      id: "gen_photos",
      label: "Kuvat",
      tip: "Liitä kuvia kohteesta.",
      weight: 10,
    },
  ],
};

const ROOF_JOB_SLUGS = new Set([
  "katto-pelti",
  "rannit",
  "ulkomaalaus",
  "julkisivu-verhous",
  "julkisivu-rapaus",
]);

const LVI_JOB_SLUGS = new Set([
  "ilmanvaihto-kone",
  "ilmanvaihto-puhdistus",
  "kayttovesi",
  "viemari",
  "vesivahinko",
]);

const INTERIOR_JOB_SLUGS = new Set([
  "kylpyhuone",
  "keittio",
  "wc-remontti",
  "sauna",
  "lattia-sisä",
  "seinamaalaus",
  "laatoitus-sisa",
]);

/** Tyhjä kuvaus täytetään tällä kun työlaji valitaan (ei strukturoituja lomakkeita). */
export function buildTemplateDescriptionSkeleton(
  template: ProjectRequestTemplate,
): string {
  const lines = template.questions.map((q) => q.promptLine);
  return [template.intro, "", ...lines].join("\n");
}

export function getProjectRequestTemplate(
  jobSlug: string | null | undefined,
): ProjectRequestTemplate {
  if (!jobSlug) return GENERIC_TEMPLATE;
  if ((HEAT_PUMP_JOB_SLUGS as readonly string[]).includes(jobSlug)) {
    return HEAT_PUMP_TEMPLATE;
  }
  if (ROOF_JOB_SLUGS.has(jobSlug)) return ROOF_TEMPLATE;
  if (LVI_JOB_SLUGS.has(jobSlug)) return LVI_TEMPLATE;
  if (INTERIOR_JOB_SLUGS.has(jobSlug)) return INTERIOR_TEMPLATE;

  const area = areaForJobSlug(jobSlug);
  if (area?.slug === "ulkokuori") return ROOF_TEMPLATE;
  if (area?.slug === "lvi-ilma") return LVI_TEMPLATE;
  if (area?.slug === "sisatilat") return INTERIOR_TEMPLATE;
  if (area?.slug === "lammitys") return HEAT_PUMP_TEMPLATE;

  return GENERIC_TEMPLATE;
}

export function isStructuredJobSlug(jobSlug: string | null | undefined): boolean {
  return (
    jobSlug === "ilmalampopumppu" ||
    jobSlug === "ilmavesilampopumppu" ||
    jobSlug === "maalampopumppu"
  );
}

export type { PublicProjectJobSlug };
