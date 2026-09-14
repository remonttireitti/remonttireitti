import type { BidEvaluationCategory } from "@/lib/bid-evaluation";
import {
  EVALUATOR_SCOPE_AREAS,
  expandEvaluatorScopesForQueue,
} from "@/lib/evaluator-scopes";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

function scopesMatchCategory(
  scopes: string[],
  category: BidEvaluationCategory,
): boolean {
  const expanded = expandEvaluatorScopesForQueue(scopes);
  return expanded.includes(category);
}

/** Onko alueella vähintään yksi arvioija, joka ottaa pyyntöjä vastaan. */
export async function countActiveEvaluatorsForCategory(
  category: BidEvaluationCategory,
): Promise<number> {
  const admin = tryCreateAdminClient();
  if (!admin) return 0;

  const { data: profiles } = await admin
    .from("evaluator_profiles")
    .select("evaluator_id, accepting_reviews")
    .eq("accepting_reviews", true);

  if (!profiles?.length) return 0;

  const evaluatorIds = profiles.map((p) => p.evaluator_id);
  const { data: scopeRows } = await admin
    .from("evaluator_scopes")
    .select("evaluator_id, scope")
    .in("evaluator_id", evaluatorIds);

  if (!scopeRows?.length) return 0;

  const scopesByEvaluator = new Map<string, string[]>();
  for (const row of scopeRows) {
    const list = scopesByEvaluator.get(row.evaluator_id) ?? [];
    list.push(row.scope as string);
    scopesByEvaluator.set(row.evaluator_id, list);
  }

  let count = 0;
  for (const id of evaluatorIds) {
    const scopes = scopesByEvaluator.get(id);
    if (!scopes?.length) continue;
    if (scopesMatchCategory(scopes, category)) count++;
  }
  return count;
}

/** Alueet joilla on vähintään yksi aktiivinen arvioija. */
export async function fetchActiveEvaluatorCategorySlugs(): Promise<
  BidEvaluationCategory[]
> {
  const admin = tryCreateAdminClient();
  if (!admin) return [];

  const { data: profiles } = await admin
    .from("evaluator_profiles")
    .select("evaluator_id")
    .eq("accepting_reviews", true);

  if (!profiles?.length) return [];

  const evaluatorIds = profiles.map((p) => p.evaluator_id);
  const { data: scopeRows } = await admin
    .from("evaluator_scopes")
    .select("evaluator_id, scope")
    .in("evaluator_id", evaluatorIds);

  if (!scopeRows?.length) return [];

  const scopesByEvaluator = new Map<string, string[]>();
  for (const row of scopeRows) {
    const list = scopesByEvaluator.get(row.evaluator_id) ?? [];
    list.push(row.scope as string);
    scopesByEvaluator.set(row.evaluator_id, list);
  }

  const categories = new Set<BidEvaluationCategory>();
  for (const scopes of scopesByEvaluator.values()) {
    for (const area of EVALUATOR_SCOPE_AREAS) {
      if (scopesMatchCategory(scopes, area.slug as BidEvaluationCategory)) {
        categories.add(area.slug as BidEvaluationCategory);
      }
    }
  }
  return [...categories];
}

/** Onko palvelussa yhtään aktiivista arvioijaa (mikä tahansa alue). */
export async function hasAnyActiveEvaluator(): Promise<boolean> {
  const admin = tryCreateAdminClient();
  if (!admin) return false;

  const { data: profiles } = await admin
    .from("evaluator_profiles")
    .select("evaluator_id")
    .eq("accepting_reviews", true);

  if (!profiles?.length) return false;

  const evaluatorIds = profiles.map((p) => p.evaluator_id);
  const { count } = await admin
    .from("evaluator_scopes")
    .select("evaluator_id", { count: "exact", head: true })
    .in("evaluator_id", evaluatorIds);

  return (count ?? 0) > 0;
}
