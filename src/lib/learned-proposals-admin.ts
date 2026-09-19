import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearnedProposalKind } from "@/lib/learned-proposals";

export type LearnedProposalAdminStatus = "pending" | "approved" | "dismissed";

export type AdminLearnedProposalRow = {
  jobSlug: string;
  slug: string;
  kind: LearnedProposalKind;
  label: string;
  requestCount: number;
  suggestionCount: number;
  adminStatus: LearnedProposalAdminStatus;
  adminNote: string | null;
  updatedAt: string;
  autoApproved: boolean;
};

export async function fetchAllLearnedProposalsAdmin(
  supabase: SupabaseClient,
): Promise<AdminLearnedProposalRow[]> {
  const { data } = await supabase
    .from("learned_proposals")
    .select(
      "job_slug, proposal_slug, kind, label, request_count, suggestion_count, admin_status, admin_note, updated_at",
    )
    .order("request_count", { ascending: false })
    .limit(200);

  return (data ?? []).map((row) => {
    const adminNote = (row.admin_note as string | null) ?? null;
    return {
      jobSlug: (row.job_slug as string) || "generic",
      slug: row.proposal_slug as string,
      kind: row.kind as LearnedProposalKind,
      label: row.label as string,
      requestCount: row.request_count as number,
      suggestionCount: (row.suggestion_count as number) ?? 0,
      adminStatus: ((row.admin_status as string) ??
        "pending") as LearnedProposalAdminStatus,
      adminNote,
      updatedAt: row.updated_at as string,
      autoApproved: adminNote?.includes("Automaattinen hyväksyntä") ?? false,
    };
  });
}
