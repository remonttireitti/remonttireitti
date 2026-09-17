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
  "kylpyhuoneremontti hinta",
  "keittiöremontti hinta",
  "kattoremontti hinta",
  "remontti hinta-arvio",
  "tarjouspyyntö remontti",
  "remontin vertailu",
  "urakoitsijan tarjous",
] as const;

export const TARJOUSARVIO_KEYWORDS = [
  "tarjousarvio",
  "tarjousvahti",
  "tarjouksen arviointi",
  "remonttitarjouksen arviointi",
  "lämpöpumppu tarjous arvio",
  "puolueeton tarjousarvio",
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
  "kylpyhuoneremontti",
  "keittiöremontti",
  "kattoremontti",
  "sähköremontti",
  "LVI-remontti",
  "julkisivuremontti",
  "terassiremontti",
  "aurinkopaneelit asennus",
  "latauspiste asennus",
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

/** Pieni apu — vapaaehtoinen naapuriapu (kapea long-tail). */
export const HELP_KEYWORDS = [
  "pieni apu",
  "naapuriapu",
  "vapaaehtoinen apu",
  "apupyyntö",
  "tarvitseeko apua",
  "pieni remontti apu",
  "kantamisapu",
  "naapuri auttaa",
  "ilmainen apu naapurilta",
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
