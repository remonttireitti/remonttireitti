import type { SupabaseClient } from "@supabase/supabase-js";

/** Näytetään asiakkaalle valinnaisena lisänä. */
export const LEARNED_ADDON_HINT_MIN = 2;
/** Vahva suositus — korostettu UI. */
export const LEARNED_ADDON_STRONG_MIN = 10;

export type LearnedProposalKind = "addon" | "info_need";

export type LearnedProposal = {
  jobSlug: string;
  slug: string;
  kind: LearnedProposalKind;
  label: string;
  requestCount: number;
  suggestionCount: number;
  tier: "hint" | "strong";
};

export function proposalSlugFromLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9äöå]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug || "item";
}

function tierFromCounts(
  requestCount: number,
  suggestionCount: number,
): "hint" | "strong" | null {
  if (
    requestCount >= LEARNED_ADDON_STRONG_MIN ||
    suggestionCount >= 5
  ) {
    return "strong";
  }
  if (requestCount >= LEARNED_ADDON_HINT_MIN) {
    return "hint";
  }
  return null;
}

function isVisibleToCustomer(row: Record<string, unknown>): boolean {
  const adminStatus = (row.admin_status as string) ?? "pending";
  if (adminStatus === "dismissed") return false;
  if (adminStatus === "approved") return true;
  return ((row.request_count as number) ?? 0) >= LEARNED_ADDON_HINT_MIN;
}

function mapRow(row: Record<string, unknown>): LearnedProposal | null {
  if (!isVisibleToCustomer(row)) return null;

  const requestCount = row.request_count as number;
  const suggestionCount = (row.suggestion_count as number) ?? 0;
  const tier = tierFromCounts(requestCount, suggestionCount);
  if (!tier) return null;

  return {
    jobSlug: (row.job_slug as string) || "generic",
    slug: row.proposal_slug as string,
    kind: row.kind as LearnedProposalKind,
    label: row.label as string,
    requestCount,
    suggestionCount,
    tier,
  };
}

export async function fetchLearnedProposalsForJob(
  supabase: SupabaseClient,
  jobSlug: string | null,
  kind?: LearnedProposalKind,
  minCount = LEARNED_ADDON_HINT_MIN,
): Promise<LearnedProposal[]> {
  const slug = jobSlug?.trim() || "generic";

  let query = supabase
    .from("learned_proposals")
    .select(
      "job_slug, proposal_slug, kind, label, request_count, suggestion_count, admin_status",
    )
    .eq("job_slug", slug)
    .neq("admin_status", "dismissed")
    .gte("request_count", minCount)
    .order("request_count", { ascending: false })
    .limit(40);

  if (kind) {
    query = query.eq("kind", kind);
  }

  const { data } = await query;

  const results: LearnedProposal[] = [];
  for (const row of data ?? []) {
    const mapped = mapRow(row as Record<string, unknown>);
    if (mapped) results.push(mapped);
  }
  return results;
}

export async function fetchAllLearnedProposals(
  supabase: SupabaseClient,
  minCount = LEARNED_ADDON_HINT_MIN,
): Promise<LearnedProposal[]> {
  const { data } = await supabase
    .from("learned_proposals")
    .select(
      "job_slug, proposal_slug, kind, label, request_count, suggestion_count, admin_status",
    )
    .neq("admin_status", "dismissed")
    .gte("request_count", minCount)
    .order("request_count", { ascending: false })
    .limit(120);

  const results: LearnedProposal[] = [];
  for (const row of data ?? []) {
    const mapped = mapRow(row as Record<string, unknown>);
    if (mapped) results.push(mapped);
  }
  return results;
}

export async function recordLearnedProposals(
  supabase: SupabaseClient,
  params: {
    jobSlug: string;
    addons: string[];
    infoNeeds: string[];
    asSuggestion?: boolean;
  },
): Promise<void> {
  const jobSlug = params.jobSlug?.trim() || "generic";
  const asSuggestion = params.asSuggestion ?? false;

  try {
    for (const label of params.addons) {
      if (!label.trim()) continue;
      await supabase.rpc("increment_learned_proposal", {
        p_job_slug: jobSlug,
        p_kind: "addon",
        p_label: label.trim(),
        p_as_suggestion: asSuggestion,
      });
    }
    for (const label of params.infoNeeds) {
      if (!label.trim()) continue;
      await supabase.rpc("increment_learned_proposal", {
        p_job_slug: jobSlug,
        p_kind: "info_need",
        p_label: label.trim(),
        p_as_suggestion: asSuggestion,
      });
    }
  } catch (err) {
    console.warn("[recordLearnedProposals]", err);
  }
}
