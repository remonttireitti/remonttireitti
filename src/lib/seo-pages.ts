import type { MetadataRoute } from "next";
import { HEAT_PUMP_JOB_SLUGS } from "@/constants/heat-pumps";
import { LISTING_PRODUCT_CATEGORIES } from "@/lib/marketplace-categories";
import {
  CALCULATOR_KEYWORDS,
  CONTRACTOR_KEYWORDS,
  HELP_KEYWORDS,
  HEAT_PUMP_KEYWORDS,
  MARKETPLACE_KEYWORDS,
  mergeKeywords,
  PUBLIC_SERVICE_SLUGS,
  SERVICE_KEYWORDS,
  SITE_KEYWORDS,
  TARJOUSARVIO_KEYWORDS,
} from "@/lib/seo-keywords";
import { SYMPTOM_SLUGS_BY_PUMP, isHeatPumpSlug } from "@/lib/troubleshooting-guides";

export type SeoPageDef = {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"];
  priority: number;
};

export const STATIC_SEO_PAGES: SeoPageDef[] = [
  {
    path: "/",
    title: "Kilpailuta remontti ilmaiseksi — ohjattu tarjouspyyntö",
    description:
      "Kilpailuta remontti ja palvelut ilmaiseksi. Ohjattu tarjouspyyntö ilman tiliä, vertaa tarjouksia ja tingaa vastatarjouksella. Ilmalämpöpumpun vian selvitys ja huolto. Asiakkaalle 0 €.",
    keywords: mergeKeywords(
      SITE_KEYWORDS,
      HEAT_PUMP_KEYWORDS.slice(0, 3),
      SERVICE_KEYWORDS.slice(0, 4),
      MARKETPLACE_KEYWORDS.slice(0, 2),
      HELP_KEYWORDS.slice(0, 4),
    ),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/palvelut",
    title: "Palvelut — remontit, asennukset ja kunnossapito",
    description:
      "Kilpailuta keittiö, kylpyhuone, lämpöpumppu, sähkö, siivous, piha, muutto ja muut työt. Jatkuva palvelu tai kertaluonteinen — ilmainen tarjouspyyntö.",
    keywords: mergeKeywords(SITE_KEYWORDS, SERVICE_KEYWORDS, [
      "kylpyhuoneremontti",
      "keittiöremontti",
      "sähköremontti",
      "LVI",
      "ilmanvaihto",
    ]),
    changeFrequency: "weekly",
    priority: 0.95,
  },
  {
    path: "/urakoitsijaksi",
    title: "Urakoitsijaksi — vastaanota remonttitarjouspyyntöjä",
    description:
      "Liity Remonttireittiin urakoitsijana: vastaanota valmiita tarjouspyyntöjä alueeltasi. Tarjous ilmaiseksi — maksat vain voitetusta diilistä. Ensimmäiset 3 diiliä 0 €.",
    keywords: mergeKeywords(SITE_KEYWORDS, CONTRACTOR_KEYWORDS),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/suosittelu",
    title: "Suosittelubonus — palkinto uusista käyttäjistä",
    description:
      "Suosittele asiakasta tai urakoitsijaa Remonttireittiin. Asiakas saa bonuksen seuraavaan remonttiin, urakoitsija ilmaisia diilejä.",
    keywords: mergeKeywords(SITE_KEYWORDS, [
      "suosittelu",
      "suosittelubonus",
      "referral",
      "bonus",
    ]),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/asiakkaalle",
    title: "Asiakkaalle — ilmainen kilpailutus remontille",
    description:
      "Kilpailuta remontit ja palvelut ilmaiseksi. Vertaa tarjouksia, tingaa vastatarjouksella ja selvitä lämpöpumpun vikat — asiakkaalle 0 €.",
    keywords: mergeKeywords(SITE_KEYWORDS, SERVICE_KEYWORDS, [
      "ilmainen remontti",
      "kilpailuta ilmaiseksi",
      "asiakkaalle ilmainen",
    ]),
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/tarjousarvio",
    title: "Tarjousvahti — ilmainen puolueeton tarjousarvio",
    description:
      "Saitko tarjoukset muualta? Lähetä ne Remonttireittiin — asiantuntija auttaa ymmärtämään hintaa ja sisältöä. 0 €, ei suositusta urakoitsijasta.",
    keywords: mergeKeywords(SITE_KEYWORDS, TARJOUSARVIO_KEYWORDS, HEAT_PUMP_KEYWORDS.slice(0, 3)),
    changeFrequency: "monthly",
    priority: 0.88,
  },
  {
    path: "/laskurit",
    title: "Remontin hintalaskurit — arvioi kustannukset ennen tarjouspyyntöä",
    description:
      "Ilmaiset remonttilaskurit: kattoremontti, ilmalämpöpumppu, kylpyhuone, keittiö, maalaus, terassi ja 40+ muuta. Viitehinnat ja kustannusjako — pyydä sitten tarjoukset ilmaiseksi.",
    keywords: mergeKeywords(SITE_KEYWORDS, CALCULATOR_KEYWORDS),
    changeFrequency: "monthly",
    priority: 0.82,
  },
  {
    path: "/apu",
    title: "Pieni apu — vapaaehtoista naapuriapua",
    description:
      "Pyydä pientä apua lähialueelta tai tarjoa vapaaehtoista apua. Kantaminen, siirtäminen ja muut pienet hommat — ei hintaa, hyvä teko synnyttää hyvää.",
    keywords: mergeKeywords(SITE_KEYWORDS, HELP_KEYWORDS),
    changeFrequency: "daily",
    priority: 0.72,
  },
  {
    path: "/tarjouspyynnot",
    title: "Avoimet tarjouspyynnöt — remontti ja palvelut",
    description:
      "Selaa avoimia remontti-, asennus- ja palvelupyyntöjä ilman kirjautumista. Urakoitsijat näkevät täydet tiedot ja jättävät tarjouksen ilmaiseksi.",
    keywords: mergeKeywords(SITE_KEYWORDS, CONTRACTOR_KEYWORDS, [
      "avoimet työt",
      "tarjouspyynnöt",
      "remonttityöt",
    ]),
    changeFrequency: "daily",
    priority: 0.85,
  },
  {
    path: "/markkinapaikka",
    title: "Remonttitori — laitteet ja tarvikkeet",
    description:
      "Osta ja myy remonttiin liittyviä laitteita, varaosia ja tarvikkeita: lämmitys, keittiö, kylpyhuone, sähkö ja muut. Ilmoitukset yksityisiltä ja urakoitsijoilta.",
    keywords: mergeKeywords(SITE_KEYWORDS, MARKETPLACE_KEYWORDS),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    path: "/markkinapaikka/ilmoitukset",
    title: "Ilmoitukset — remonttitori",
    description:
      "Selaa remonttitorin ilmoituksia: laitteet, varaosat, tarvikkeet ja työkalut remonttiin.",
    keywords: mergeKeywords(MARKETPLACE_KEYWORDS, ["ilmoitukset", "myydään"]),
    changeFrequency: "daily",
    priority: 0.85,
  },
  {
    path: "/markkinapaikka/hinnasto",
    title: "Hinnasto — ilmoitusmaksut",
    description:
      "Markkinapaikan hinnasto: ilmoituksen julkaisu, näkyvyys ja lisäpalvelut.",
    keywords: mergeKeywords(MARKETPLACE_KEYWORDS, ["hinnasto", "hinta"]),
    changeFrequency: "monthly",
    priority: 0.65,
  },
  {
    path: "/markkinapaikka/ilmoita",
    title: "Ilmoita myytävä — remonttitori",
    description:
      "Luo ilmoitus remonttitorille — myy laite, varaosa, tarvike tai työkalu remonttiin liittyen.",
    keywords: mergeKeywords(MARKETPLACE_KEYWORDS, ["myy", "ilmoitus"]),
    changeFrequency: "monthly",
    priority: 0.65,
  },
  {
    path: "/huolto/uusi",
    title: "Huolto tai korjaus — lämpöpumppu",
    description:
      "Kilpailuta lämpöpumpun huolto tai korjaus. Kuvaile vika, lisää kuvia ja saa tarjouksia päteviltä urakoitsijoilta.",
    keywords: mergeKeywords(HEAT_PUMP_KEYWORDS, [
      "huolto",
      "korjaus",
      "vika",
      "tarjouspyyntö",
    ]),
    changeFrequency: "weekly",
    priority: 0.85,
  },
  {
    path: "/vian-selvitys",
    title: "Lämpöpumpun vian selvitys — tarkista itse ennen huoltoa",
    description:
      "Lämpöpumppu ei lämmitä, virhekoodi tai vuoto? Ilmainen tarkistuslista ilmalämpö-, vesi-ilmalämpö- ja maalämpöpumpuille. Jos vika jää, kilpailuta huolto ilmaiseksi.",
    keywords: mergeKeywords(HEAT_PUMP_KEYWORDS, [
      "vianmääritys",
      "vika",
      "ohje",
      "itse apu",
    ]),
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/hinta-arkisto",
    title: "Hinta-arkisto — toteutuneet remontti- ja asennushinnat",
    description:
      "Anonymisoitu yhteenveto hyväksytyistä tarjouksista: keittiö, kylpyhuone, katto, lämpöpumput ja muut työlajit. Vertaa alueen mediaanihintoja ennen kilpailutusta.",
    keywords: mergeKeywords(SERVICE_KEYWORDS, HEAT_PUMP_KEYWORDS, [
      "remontti hinta",
      "keittiöremontti hinta",
      "kylpyhuoneremontti hinta",
      "kattoremontti hinta",
      "hinta-arvio",
      "mediaanihinta",
    ]),
    changeFrequency: "weekly",
    priority: 0.78,
  },
  {
    path: "/tietosuoja",
    title: "Tietosuoja",
    description: "Remonttireitin tietosuojaseloste ja henkilötietojen käsittely.",
    changeFrequency: "yearly",
    priority: 0.2,
  },
  {
    path: "/kayttoehdot",
    title: "Käyttöehdot",
    description: "Remonttireitin palvelun käyttöehdot.",
    changeFrequency: "yearly",
    priority: 0.2,
  },
];

export function seoDefByPath(path: string): SeoPageDef | undefined {
  return STATIC_SEO_PAGES.find((p) => p.path === path);
}

export function troubleshootingSitemapEntries(
  base: string,
  now: Date,
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const pump of HEAT_PUMP_JOB_SLUGS) {
    entries.push({
      url: `${base}/vian-selvitys/${pump}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
    if (isHeatPumpSlug(pump)) {
      for (const symptom of SYMPTOM_SLUGS_BY_PUMP[pump]) {
        entries.push({
          url: `${base}/vian-selvitys/${pump}/${symptom}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.85,
        });
      }
    }
  }

  return entries;
}

export function marketplaceCategorySitemapEntries(
  base: string,
  now: Date,
): MetadataRoute.Sitemap {
  return LISTING_PRODUCT_CATEGORIES.map((c) => ({
    url: `${base}/markkinapaikka/ilmoitukset?kategoria=${c.urlSlug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.72,
  }));
}

export function publicServiceSitemapEntries(
  base: string,
  now: Date,
): MetadataRoute.Sitemap {
  return PUBLIC_SERVICE_SLUGS.map((slug) => ({
    url: `${base}/palvelut/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.82,
  }));
}

export function contractorProfileSitemapEntries(
  base: string,
  contractors: { id: string; updated_at: string }[],
): MetadataRoute.Sitemap {
  return contractors.map((row) => ({
    url: `${base}/urakoitsija/${row.id}`,
    lastModified: new Date(row.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.55,
  }));
}

export function calculatorSitemapEntries(
  base: string,
  now: Date,
  slugs: string[],
): MetadataRoute.Sitemap {
  return slugs.map((slug) => ({
    url: `${base}/laskurit/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority:
      slug === "kylpyhuoneremontti" ||
      slug === "kylpyhuone" ||
      slug === "ilmalampopumppu" ||
      slug === "kattoremontti" ||
      slug === "keittioremontti"
        ? 0.88
        : 0.8,
  }));
}

export function helpRequestSitemapEntries(
  base: string,
  requests: { id: string; created_at: string }[],
): MetadataRoute.Sitemap {
  return requests.map((row) => ({
    url: `${base}/apu/${row.id}`,
    lastModified: new Date(row.created_at),
    changeFrequency: "daily" as const,
    priority: 0.55,
  }));
}

const SERVICE_SEO_OVERRIDES: Record<
  string,
  { title: string; description: string; keywords?: string[] }
> = {
  ilmalampopumppu: {
    title: "Ilmalämpöpumpun asennus — kilpailuta ilmaiseksi",
    description:
      "Kilpailuta ilmalämpöpumpun asennus ilmaiseksi. Vertaa tarjouksia samassa muodossa, tingaa vastatarjouksella. Laskuri ja vian selvitys samassa palvelussa.",
    keywords: [
      "ilmalämpöpumpun asennus",
      "ilmalämpöpumppu hinta",
      "ILP asennus",
      "kilpailuta ilmalämpöpumppu",
    ],
  },
  ilmavesilampopumppu: {
    title: "Ilmavesilämpöpumpun asennus — kilpailuta ilmaiseksi",
    description:
      "Kilpailuta ilmavesilämpöpumpun asennus ilmaiseksi. Vertaa laite- ja asennustarjouksia, tingaa ennen valintaa.",
    keywords: ["ilmavesilämpöpumppu", "VILP asennus", "ilmavesilämpöpumppu hinta"],
  },
  maalampopumppu: {
    title: "Maalämpöpumpun asennus — kilpailuta ilmaiseksi",
    description:
      "Kilpailuta maalämpöpumpun asennus ilmaiseksi. Vertaa kokonaistarjouksia: laite, kaivo ja asennus.",
    keywords: ["maalämpöpumppu", "maalämpö asennus", "maalämpöpumppu hinta"],
  },
  "lampopumppu-huolto": {
    title: "Lämpöpumpun huolto — kilpailuta ilmaiseksi",
    description:
      "Kilpailuta lämpöpumpun huolto ilmaiseksi. Selvitä vika itse oppailla ja pyydä tarjouksia alueesi huoltajilta.",
    keywords: ["lämpöpumpun huolto", "ilmalämpöpumppu huolto", "ILP huolto"],
  },
  "lampopumppu-korjaus": {
    title: "Lämpöpumpun korjaus — kilpailuta ilmaiseksi",
    description:
      "Kilpailuta lämpöpumpun korjaus ilmaiseksi. Käytä vian selvitystä ensin — sitten tarjoukset samassa muodossa.",
    keywords: ["lämpöpumpun korjaus", "ilmalämpöpumppu korjaus", "ILP korjaus"],
  },
  kylpyhuone: {
    title: "Kylpyhuoneremontti — kilpailuta ilmaiseksi",
    description:
      "Kilpailuta kylpyhuoneremontti ilmaiseksi. Vertaa tarjouksia, arvioi hinta laskurilla ja tingaa vastatarjouksella.",
    keywords: ["kylpyhuoneremontti", "kylpyhuoneremontti hinta", "vesieristys"],
  },
  keittio: {
    title: "Keittiöremontti — kilpailuta ilmaiseksi",
    description:
      "Kilpailuta keittiöremontti ilmaiseksi. Vertaa tarjouksia samassa muodossa ja arvioi kustannukset laskurilla.",
    keywords: ["keittiöremontti", "keittiöremontti hinta"],
  },
  "katto-pelti": {
    title: "Kattoremontti — kilpailuta ilmaiseksi",
    description:
      "Kilpailuta kattoremontti ilmaiseksi. Vertaa tarjouksia ja arvioi hinta kattoremonttilaskurilla ennen pyyntöä.",
    keywords: ["kattoremontti", "kattoremontti hinta", "peltikatto"],
  },
};

export function buildServicePageSeo(job: {
  slug: string;
  name_fi: string;
  description_fi: string | null;
  search_keywords: string[];
}): Pick<SeoPageDef, "title" | "description" | "keywords"> {
  const name = job.name_fi.trim();
  const override = SERVICE_SEO_OVERRIDES[job.slug];
  const desc =
    override?.description ||
    job.description_fi?.trim() ||
    `Kilpailuta ${name.toLowerCase()} ilmaiseksi. Luo tarjouspyyntö, vertaile urakoitsijoiden tarjouksia ja valitse paras — Remonttireitti.`;

  return {
    title: override?.title ?? `Kilpailuta ${name.toLowerCase()} — ilmainen tarjouspyyntö`,
    description: desc.slice(0, 160),
    keywords: mergeKeywords(
      SITE_KEYWORDS,
      job.search_keywords,
      override?.keywords,
      [name.toLowerCase()],
    ),
  };
}
