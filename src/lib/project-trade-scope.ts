import type { JobTypeWithTrades, Trade } from "@/types/job-catalog";

/** Asiakkaalle näytettävä tarkennus ammatin tyypillisistä tehtävistä. */
export const TRADE_SCOPE_HINTS: Record<string, string> = {
  sahko: "Valaistus, pistorasiat, sähkökiuas, lattialämmitys",
  putki: "Viemärit, hanat, suihku, lämmitysputket",
  laatoitus: "Laatoitus ja vedeneristys (sertifioitu)",
  maalari: "Maalaus ja pintakäsittely",
  kirvesmies: "Rakentaminen, panelit, lauteet, runko",
  iv: "Ilmanvaihto ja kanavisto",
  kattomies: "Katto, vesikate, kattoluukut",
  muurari: "Muuraus ja tiilityöt",
  lattia: "Parketti, laminaatti, lattiat",
  eristys: "Lämmöneristeet ja tuulenpitävät",
  purku: "Purkutyöt ja jätehuolto",
  nuohooja: "Hormien nuohous ja tarkastus",
};

export function tradesForJobType(
  catalogTrades: Trade[],
  jobType: JobTypeWithTrades | null,
): Trade[] {
  if (!jobType || jobType.suggested_trade_ids.length === 0) return [];
  const byId = new Map(catalogTrades.map((t) => [t.id, t]));
  return jobType.suggested_trade_ids
    .map((id) => byId.get(id))
    .filter(Boolean) as Trade[];
}

export function tradeScopeHint(slug: string): string | null {
  return TRADE_SCOPE_HINTS[slug] ?? null;
}
