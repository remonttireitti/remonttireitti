export type Trade = {
  id: string;
  slug: string;
  name_fi: string;
  description_fi: string | null;
  sort_order: number;
};

export type JobType = {
  id: string;
  slug: string;
  name_fi: string;
  description_fi: string | null;
  search_keywords: string[];
  legacy_category_id: string | null;
  sort_order: number;
};

export type JobTypeTradeLink = {
  job_type_id: string;
  trade_id: string;
  is_required: boolean;
};

export type JobTypeWithTrades = JobType & {
  suggested_trade_ids: string[];
  required_trade_ids: string[];
};

export type JobCatalog = {
  trades: Trade[];
  jobTypes: JobTypeWithTrades[];
};

export function buildJobCatalog(
  trades: Trade[],
  jobTypes: JobType[],
  links: JobTypeTradeLink[],
): JobCatalog {
  const byJob = new Map<string, { suggested: string[]; required: string[] }>();

  for (const link of links) {
    const entry = byJob.get(link.job_type_id) ?? {
      suggested: [],
      required: [],
    };
    entry.suggested.push(link.trade_id);
    if (link.is_required) entry.required.push(link.trade_id);
    byJob.set(link.job_type_id, entry);
  }

  return {
    trades: [...trades].sort((a, b) => a.sort_order - b.sort_order),
    jobTypes: jobTypes
      .map((jt) => {
        const t = byJob.get(jt.id);
        return {
          ...jt,
          suggested_trade_ids: t?.suggested ?? [],
          required_trade_ids: t?.required ?? [],
        };
      })
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}

function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9\s-]/g, " ");
}

function searchBlob(jt: JobTypeWithTrades): string {
  return normalizeSearch(
    [jt.name_fi, jt.description_fi ?? "", ...jt.search_keywords].join(" "),
  );
}

/** Hae työkohteita hakusanalla (osittaiset osumat, useita sanoja). */
export function searchJobTypes(
  query: string,
  jobTypes: JobTypeWithTrades[],
): JobTypeWithTrades[] {
  const q = normalizeSearch(query);
  if (!q) return jobTypes;

  const words = q.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) return jobTypes;

  const scored = jobTypes
    .map((jt) => {
      const blob = searchBlob(jt);
      let score = 0;
      if (blob.includes(q)) score += 10;
      for (const w of words) {
        if (normalizeSearch(jt.name_fi).includes(w)) score += 5;
        if (blob.includes(w)) score += 2;
        if (jt.search_keywords.some((kw) => normalizeSearch(kw).startsWith(w))) {
          score += 3;
        }
      }
      return { jt, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ jt }) => jt);
}

/** Työt, joissa ammatti on mukana (selaus välilehdeltä). */
export function jobTypesForTrade(
  tradeId: string,
  jobTypes: JobTypeWithTrades[],
): JobTypeWithTrades[] {
  return jobTypes.filter((jt) => jt.suggested_trade_ids.includes(tradeId));
}
