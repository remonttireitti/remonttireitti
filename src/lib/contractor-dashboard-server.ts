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

const SUBMITTED_BID_STATUSES: BidStatus[] = [
  "submitted",
  "accepted",
  "rejected",
];

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

type BidRow = {
  id: string;
  status: BidStatus;
  amount_cents: number;
  submitted_at: string | null;
  project_id: string;
};

type ProjectRow = {
  id: string;
  title: string;
  municipality: string;
  status: string;
};

function buildDashboardBid(
  bid: BidRow,
  project: ProjectRow | undefined,
): ContractorDashboardBid {
  return {
    id: bid.id,
    status: bid.status,
    amount_cents: bid.amount_cents,
    submitted_at: bid.submitted_at,
    project_id: bid.project_id,
    project_title: project?.title ?? "Tarjouspyyntö",
    project_municipality: project?.municipality ?? "—",
    project_status: project?.status ?? "unknown",
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

  const { data: bidRows, error: bidError } = await supabase
    .from("bids")
    .select("id, status, amount_cents, submitted_at, project_id")
    .eq("contractor_id", contractorId)
    .not("submitted_at", "is", null)
    .in("status", SUBMITTED_BID_STATUSES)
    .order("submitted_at", { ascending: false });

  if (bidError) {
    console.error("[fetchContractorDashboard/bids]", bidError.message);
  }

  const submittedBids = (bidRows ?? []) as BidRow[];
  const projectIds = [...new Set(submittedBids.map((b) => b.project_id))];

  let projectMap = new Map<string, ProjectRow>();
  if (projectIds.length > 0) {
    const { data: projectRows, error: projectError } = await supabase
      .from("projects")
      .select("id, title, municipality, status")
      .in("id", projectIds);

    if (projectError) {
      console.error(
        "[fetchContractorDashboard/projects]",
        projectError.message,
      );
    }

    projectMap = new Map(
      ((projectRows ?? []) as ProjectRow[]).map((p) => [p.id, p]),
    );
  }

  const recentBids = submittedBids
    .slice(0, 8)
    .map((bid) => buildDashboardBid(bid, projectMap.get(bid.project_id)));

  const bidProjectIds = new Set(submittedBids.map((b) => b.project_id));

  const submittedCount = submittedBids.length;
  const acceptedCount = submittedBids.filter(
    (b) => b.status === "accepted",
  ).length;
  const activeBidCount = submittedBids.filter(
    (b) => b.status === "submitted",
  ).length;
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
