/** Urakoitsijan valittavissa olevat ammatit (omakotitalo). */
export const PUBLIC_CONTRACTOR_TRADE_SLUGS = [
  "sahko",
  "putki",
  "iv",
  "kirvesmies",
  "maalari",
  "laatoitus",
  "kattomies",
  "pelti",
  "lasi",
  "lattia",
  "muurari",
  "nuohooja",
  "eristys",
  "betoni",
  "maanrakennus",
  "purku",
  "siivous",
  "piha-palvelu",
  "kuljetus",
] as const;

export type PublicContractorTradeSlug =
  (typeof PUBLIC_CONTRACTOR_TRADE_SLUGS)[number];
