/** Yleiset hakusanat — sivukohtaiset täydentävät näitä. */
export const SITE_KEYWORDS = [
  "remontti",
  "kilpailuta remontti",
  "tarjouspyyntö",
  "urakoitsija",
  "omakotitalo",
  "remontin kilpailutus",
  "remonttitarjous",
  "remonttireitti",
  "ilmainen tarjouspyyntö",
  "vertaile tarjouksia",
  "palvelut kotiin",
  "remonttitori",
] as const;

export const SERVICE_KEYWORDS = [
  "siivouspalvelu",
  "kotisiivous",
  "nurmikon leikkuu",
  "lumityö",
  "ikkunanpesu",
  "kattopesu",
  "muuttopalvelu",
  "jatkuva palvelu",
  "kunnossapito",
] as const;

export const HEAT_PUMP_KEYWORDS = [
  "lämpöpumppu",
  "lampopumppu",
  "ilmalämpöpumppu",
  "ilmavesilämpöpumppu",
  "maalämpöpumppu",
  "lämpöpumpun asennus",
  "lämpöpumpun huolto",
  "lämpöpumpun korjaus",
] as const;

export const MARKETPLACE_KEYWORDS = [
  "remonttitori",
  "myydään remontti",
  "käytetty keittiö",
  "käytetty kylpyhuone",
  "remonttitarvikkeet",
  "rakennustarvikkeet",
  "lämpöpumppu myydään",
  "käytetty lämpöpumppu",
  "varaosat",
  "remonttilaitteet",
] as const;

export const CONTRACTOR_KEYWORDS = [
  "urakoitsijalle",
  "remonttityöt",
  "tarjouspyynnöt urakoitsijalle",
  "välityspalkkio",
  "remonttityö",
] as const;

export function mergeKeywords(
  ...groups: (readonly string[] | string[] | undefined)[]
): string[] {
  const set = new Set<string>();
  for (const group of groups) {
    for (const kw of group ?? []) {
      const t = kw.trim();
      if (t) set.add(t);
    }
  }
  return [...set];
}

/** Julkinen palvelusivu — slugit sitemapissa ja /palvelut/[slug]. */
export const PUBLIC_SERVICE_SLUGS = [
  ...new Set([
    "ilmalampopumppu",
    "ilmavesilampopumppu",
    "maalampopumppu",
    "lammitys-vaihto",
    "lampopumppu-huolto",
    "lampopumppu-korjaus",
    "takka-kamiina",
    "puukattila",
    "hormi",
    "puulammitys-varaaja",
    "latauspiste",
    "aurinkopaneelit",
    "sahkokeskus",
    "sahko-lisays",
    "ulko-valaistus",
    "ilmanvaihto-kone",
    "ilmanvaihto-puhdistus",
    "kayttovesi",
    "viemari",
    "vesivahinko",
    "kylpyhuone",
    "keittio",
    "wc-remontti",
    "sauna",
    "lattia-sisä",
    "seinamaalaus",
    "laatoitus-sisa",
    "ikkunat",
    "ovet-ulko",
    "katto-pelti",
    "rannit",
    "ulkomaalaus",
    "julkisivu-verhous",
    "julkisivu-rapaus",
    "sokkeli",
    "perustus",
    "vaihe-eriste",
    "terassi",
    "pihatie",
    "aita",
    "siivous-koti",
    "siivous-loppu",
    "muutto",
    "kuljetus",
    "ikkunanpesu",
    "kattopesu",
    "nurmikon-leikkuu",
    "lumityo",
  ]),
] as const;

export type PublicServiceSlug = (typeof PUBLIC_SERVICE_SLUGS)[number];

export function isPublicServiceSlug(slug: string): slug is PublicServiceSlug {
  return (PUBLIC_SERVICE_SLUGS as readonly string[]).includes(slug);
}
