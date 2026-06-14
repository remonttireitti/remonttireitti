import type { MetadataRoute } from "next";
import { HEAT_PUMP_JOB_SLUGS } from "@/constants/heat-pumps";
import { LISTING_PRODUCT_CATEGORIES } from "@/lib/marketplace-categories";
import {
  CONTRACTOR_KEYWORDS,
  HEAT_PUMP_KEYWORDS,
  MARKETPLACE_KEYWORDS,
  mergeKeywords,
  PUBLIC_SERVICE_SLUGS,
  SERVICE_KEYWORDS,
  SITE_KEYWORDS,
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
    title: "Kilpailuta remontti ja palvelut ilmaiseksi",
    description:
      "Remontit, lämmitys, huolto ja kunnossapito kilpailutettuna. Siivous, piha, muutto — myös jatkuva palvelu. Remonttitori laitteille. Ilmainen tarjouspyyntö omakotitaloon.",
    keywords: mergeKeywords(
      SITE_KEYWORDS,
      HEAT_PUMP_KEYWORDS.slice(0, 3),
      SERVICE_KEYWORDS.slice(0, 4),
      MARKETPLACE_KEYWORDS.slice(0, 2),
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
    title: "Urakoitsijalle — tarjouspyynnöt ja uudet työt",
    description:
      "Saat ilmoitukset sopivista tarjouspyynnöistä omalta alueeltasi, jätät tarjouksia maksutta ja maksat välityspalkkion vain hyväksytyistä diileistä.",
    keywords: mergeKeywords(SITE_KEYWORDS, CONTRACTOR_KEYWORDS),
    changeFrequency: "monthly",
    priority: 0.8,
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
    title: "Lämpöpumpun vian selvitys",
    description:
      "Tarkista lämpöpumpun yleisimmät viat itse — ilmalämpö, vesi-ilmalämpö ja maalämpö. Jos ongelma ei ratkea, kilpailuta huolto ammattilaiselta.",
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
          priority: 0.7,
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

export function buildServicePageSeo(job: {
  slug: string;
  name_fi: string;
  description_fi: string | null;
  search_keywords: string[];
}): Pick<SeoPageDef, "title" | "description" | "keywords"> {
  const name = job.name_fi.trim();
  const desc =
    job.description_fi?.trim() ||
    `Kilpailuta ${name.toLowerCase()} ilmaiseksi. Luo tarjouspyyntö, vertaile urakoitsijoiden tarjouksia ja valitse paras — Remonttireitti.`;

  return {
    title: `Kilpailuta ${name.toLowerCase()} — ilmainen tarjouspyyntö`,
    description: desc.slice(0, 160),
    keywords: mergeKeywords(SITE_KEYWORDS, job.search_keywords, [name.toLowerCase()]),
  };
}
