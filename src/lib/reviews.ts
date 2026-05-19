import type { SupabaseClient } from "@supabase/supabase-js";

export type ContractorRatingSummary = {
  average: number;
  count: number;
};

export function formatRatingStars(rating: number): string {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export function formatRatingAverage(avg: number | null, count: number): string {
  if (!count || avg === null) return "Ei arvosteluja";
  return `${avg.toFixed(1)} (${count})`;
}

export async function fetchContractorRatings(
  supabase: SupabaseClient,
  contractorIds: string[],
): Promise<Map<string, ContractorRatingSummary>> {
  const map = new Map<string, ContractorRatingSummary>();
  if (contractorIds.length === 0) return map;

  const { data } = await supabase
    .from("reviews")
    .select("contractor_id, rating")
    .in("contractor_id", contractorIds);

  const buckets = new Map<string, number[]>();
  for (const row of data ?? []) {
    const list = buckets.get(row.contractor_id) ?? [];
    list.push(row.rating);
    buckets.set(row.contractor_id, list);
  }

  for (const [id, ratings] of buckets) {
    const sum = ratings.reduce((a, b) => a + b, 0);
    map.set(id, { average: sum / ratings.length, count: ratings.length });
  }

  return map;
}
