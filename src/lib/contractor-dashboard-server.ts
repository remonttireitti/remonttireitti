import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchContractorOpenProjects,
  loadContractorMatchProfile,
  type ContractorOpenProject,
} from "@/lib/contractor-projects-server";
import {
  countByFilter,
  filterContractorProjects,
} from "@/lib/contractor-work-filter";
import type { BidStatus } from "@/types/database";

export type ContractorDashboardStats = {
  submittedCount: number;
  acceptedCount: number;
  activeBidCount: number;
  conversionPercent: number | null;
  openMatchCount: number;
  openTotalCount: number;
};

export type ContractorDashboardBid = {
  id: string;
  status: BidStatus;
  amount_cents: number;
  submitted_at: string | null;
  project_id: string;
  project_title: string;
  project_municipality: string;
  project_status: string;
};

export type ContractorDashboardData = {
  recommendedProjects: ContractorOpenProject[];
  recentBids: ContractorDashboardBid[];
  bidProjectIds: Set<string>;
  stats: ContractorDashboardStats;
};

function parseBidRow(raw: Record<string, unknown>): ContractorDashboardBid | null {
  const projects = raw.projects as
    | { title: string; municipality: string; status: string }
    | { title: string; municipality: string; status: string }[]
    | null;
  const project = Array.isArray(projects) ? projects[0] : projects;
  if (!project) return null;

  return {
    id: String(raw.id),
    status: raw.status as BidStatus,
    amount_cents: Number(raw.amount_cents),
    submitted_at: raw.submitted_at != null ? String(raw.submitted_at) : null,
    project_id: String(raw.project_id),
    project_title: project.title,
    project_municipality: project.municipality,
    project_status: project.status,
  };
}

export async function fetchContractorDashboard(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<ContractorDashboardData> {
  const profile = await loadContractorMatchProfile(supabase, contractorId);
  const allProjects = await fetchContractorOpenProjects(
    supabase,
    contractorId,
    profile,
  );
  const counts = countByFilter(allProjects);
  const recommendedProjects = filterContractorProjects(
    allProjects,
    "oma-alue",
  ).slice(0, 5);

  const { data: bidRows } = await supabase
    .from("bids")
    .select(
      `
      id,
      status,
      amount_cents,
      submitted_at,
      project_id,
      projects ( title, municipality, status )
    `,
    )
    .eq("contractor_id", contractorId)
    .not("status", "eq", "draft")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(8);

  const recentBids = (bidRows ?? [])
    .map((row) => parseBidRow(row as Record<string, unknown>))
    .filter((row): row is ContractorDashboardBid => row != null);

  const bidProjectIds = new Set(recentBids.map((b) => b.project_id));

  const { data: allBidStatuses } = await supabase
    .from("bids")
    .select("status")
    .eq("contractor_id", contractorId)
    .not("submitted_at", "is", null)
    .in("status", ["submitted", "accepted", "rejected"]);

  const submittedCount = allBidStatuses?.length ?? 0;
  const acceptedCount =
    allBidStatuses?.filter((b) => b.status === "accepted").length ?? 0;
  const activeBidCount =
    allBidStatuses?.filter((b) => b.status === "submitted").length ?? 0;
  const conversionPercent =
    submittedCount > 0
      ? Math.round((acceptedCount / submittedCount) * 1000) / 10
      : null;

  return {
    recommendedProjects,
    recentBids,
    bidProjectIds,
    stats: {
      submittedCount,
      acceptedCount,
      activeBidCount,
      conversionPercent,
      openMatchCount: counts["oma-alue"],
      openTotalCount: counts.kaikki,
    },
  };
}
