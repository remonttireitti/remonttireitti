import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { BidEvaluationCategory } from "@/lib/bid-evaluation";

export async function isEvaluator(): Promise<boolean> {
  const profile = await getProfile();
  if (!profile) return false;
  if (profile.role === "admin") return true;

  const supabase = await createClient();
  const { count } = await supabase
    .from("evaluator_scopes")
    .select("scope", { count: "exact", head: true })
    .eq("evaluator_id", profile.id);

  return (count ?? 0) > 0;
}

export async function requireEvaluator() {
  const ok = await isEvaluator();
  if (!ok) redirect("/oma-tili?viesti=ei-oikeuksia");
}

export async function fetchEvaluatorScopes(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "admin") return ["heat_pump", "general"];

  const { data } = await supabase
    .from("evaluator_scopes")
    .select("scope")
    .eq("evaluator_id", userId);

  return (data ?? []).map((r) => r.scope as string);
}

export async function evaluatorCanReviewCategory(
  userId: string,
  category: BidEvaluationCategory,
): Promise<boolean> {
  const scopes = await fetchEvaluatorScopes(userId);
  return scopes.includes(category);
}

export async function isEvaluatorAcceptingReviews(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluator_profiles")
    .select("accepting_reviews")
    .eq("evaluator_id", userId)
    .maybeSingle();

  return data?.accepting_reviews ?? true;
}
