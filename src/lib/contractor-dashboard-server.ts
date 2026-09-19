import type { SupabaseClient } from "@supabase/supabase-js";
import { bidStatusLabels } from "@/lib/bids";
import {
  fetchContractorOpenProjects,
  loadContractorMatchProfile,
  type ContractorOpenProject,
} from "@/lib/contractor-projects-server";
import {
  countByFilter,
  filterContractorProjects,
} from "@/lib/contractor-work-filter";
import {
  contractorQuoteCalculatorPath,
  contractorQuotePdfDownloadPath,
} from "@/lib/contractor-quote-paths";
import {
  CONTRACTOR_QUOTE_STATUS_LABELS,
  contractorQuoteStatusTone,
  resolveContractorQuoteStatus,
  type ContractorQuoteStatus,
} from "@/lib/contractor-quote-types";
import type { BidStatus } from "@/types/database";

const SUBMITTED_BID_STATUSES: BidStatus[] = [
  "submitted",
  "accepted",
  "rejected",
];

const OFFER_LIST_LIMIT = 8;

/** Laskuritarjoukset listassa / tilastoissa (ei luonnoksia). */
const QUOTE_LIST_STATUSES = ["ready", "sent", "ordered", "rejected", "finalized"] as const;

export type ContractorDashboardStats = {
  /** Remonttireitti-markkinapaikan lähetetyt tarjoukset. */
  marketplaceCount: number;
  /** Tarjouslaskurin valmiit/lähetetyt/päätetyt tarjoukset. */
  calculatorCount: number;
  /** marketplaceCount + calculatorCount */
  submittedCount: number;
  /** Hyväksytyt (RR) + tilatut (laskuri). */
  acceptedCount: number;
  /**
   * Asiakkaan päätöstä odottavat: RR status=submitted + laskuri status=sent (Lähetetty).
   * Ei sisällä luonnoksia eikä "Valmis lähetettäväksi".
   */
  waitingCount: number;
  /** Lähetetyt tarjoukset konversiolaskentaan (RR + laskuri PDF/sent+). */
  sentCount: number;
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

export type ContractorDashboardOfferSource = "marketplace" | "calculator";

export type ContractorDashboardOffer = {
  id: string;
  source: ContractorDashboardOfferSource;
  title: string;
  locationLabel: string;
  amount_cents: number;
  date: string | null;
  statusLabel: string;
  statusTone: "sky" | "emerald" | "stone" | "amber";
  href: string;
  pdfHref: string | null;
  pdfLabel: string | null;
  sourceLabel: string;
  /** true = odottaa asiakkaan päätöstä (Lähetetty). */
  isWaiting: boolean;
};

export type ContractorDashboardData = {
  recommendedProjects: ContractorOpenProject[];
  recentBids: ContractorDashboardBid[];
  recentOffers: ContractorDashboardOffer[];
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

type QuoteRow = {
  id: string;
  title: string;
  total_cents: number;
  client_name: string | null;
  site_municipality: string | null;
  pdf_generated_at: string | null;
  outcome: string | null;
  status: string | null;
  calculator_slug: string;
  updated_at: string;
  created_at: string;
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

function bidHref(bid: ContractorDashboardBid): string {
  if (bid.status === "accepted") {
    return `/tarjoukset/urakka/${bid.project_id}`;
  }
  return `/tarjoukset/${bid.project_id}`;
}

function bidStatusTone(status: BidStatus): ContractorDashboardOffer["statusTone"] {
  if (status === "accepted") return "emerald";
  if (status === "submitted") return "amber";
  if (status === "rejected") return "stone";
  return "sky";
}

function quoteLifecycle(quote: QuoteRow): ContractorQuoteStatus {
  return resolveContractorQuoteStatus({
    status: quote.status,
    pdf_generated_at: quote.pdf_generated_at,
    outcome: quote.outcome,
  });
}

function offerFromBid(bid: ContractorDashboardBid): ContractorDashboardOffer {
  return {
    id: `bid-${bid.id}`,
    source: "marketplace",
    title: bid.project_title,
    locationLabel: bid.project_municipality,
    amount_cents: bid.amount_cents,
    date: bid.submitted_at,
    statusLabel: bidStatusLabels[bid.status],
    statusTone: bidStatusTone(bid.status),
    href: bidHref(bid),
    pdfHref: null,
    pdfLabel: null,
    sourceLabel: "Tarjouspyyntö",
    isWaiting: bid.status === "submitted",
  };
}

function offerFromQuote(quote: QuoteRow): ContractorDashboardOffer {
  const status = quoteLifecycle(quote);
  const location =
    quote.site_municipality?.trim() ||
    quote.client_name?.trim() ||
    "Oma tarjous";

  return {
    id: `quote-${quote.id}`,
    source: "calculator",
    title: quote.title,
    locationLabel: location,
    amount_cents: quote.total_cents,
    date: quote.updated_at || quote.created_at,
    statusLabel: CONTRACTOR_QUOTE_STATUS_LABELS[status],
    statusTone: contractorQuoteStatusTone(status),
    href: contractorQuoteCalculatorPath(quote.calculator_slug),
    pdfHref: contractorQuotePdfDownloadPath(quote.id),
    pdfLabel:
      status === "sent" ||
      status === "ordered" ||
      status === "rejected" ||
      Boolean(quote.pdf_generated_at)
        ? "Lataa PDF uudelleen"
        : "Lataa PDF",
    sourceLabel: "Tarjouslaskuri",
    isWaiting: status === "sent",
  };
}

function mergeRecentOffers(
  bids: ContractorDashboardBid[],
  quotes: QuoteRow[],
  limit = OFFER_LIST_LIMIT,
): ContractorDashboardOffer[] {
  const offers: Array<ContractorDashboardOffer & { sortAt: number }> = [
    ...bids.map((bid) => ({
      ...offerFromBid(bid),
      sortAt: bid.submitted_at ? Date.parse(bid.submitted_at) : 0,
    })),
    ...quotes.map((quote) => ({
      ...offerFromQuote(quote),
      sortAt: Date.parse(quote.updated_at || quote.created_at) || 0,
    })),
  ];

  // Odottavat (Lähetetty) ensin, sitten tuoreimmat — header-luku ja listan
  // badge't vastaavat toisiaan paremmin.
  return offers
    .sort((a, b) => {
      if (a.isWaiting !== b.isWaiting) return a.isWaiting ? -1 : 1;
      return b.sortAt - a.sortAt;
    })
    .slice(0, limit)
    .map(({ sortAt: _sortAt, ...offer }) => offer);
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

  const [bidsResult, quotesResult] = await Promise.all([
    supabase
      .from("bids")
      .select("id, status, amount_cents, submitted_at, project_id")
      .eq("contractor_id", contractorId)
      .not("submitted_at", "is", null)
      .in("status", SUBMITTED_BID_STATUSES)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("contractor_quotes")
      .select(
        "id, title, total_cents, client_name, site_municipality, pdf_generated_at, outcome, status, calculator_slug, updated_at, created_at",
      )
      .eq("contractor_id", contractorId)
      .in("status", [...QUOTE_LIST_STATUSES])
      .order("updated_at", { ascending: false }),
  ]);

  if (bidsResult.error) {
    console.error("[fetchContractorDashboard/bids]", bidsResult.error.message);
  }
  if (quotesResult.error) {
    console.error(
      "[fetchContractorDashboard/quotes]",
      quotesResult.error.message,
    );
  }

  const submittedBids = (bidsResult.data ?? []) as BidRow[];
  const calculatorQuotes = (quotesResult.data ?? []) as QuoteRow[];
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

  const allDashboardBids = submittedBids.map((bid) =>
    buildDashboardBid(bid, projectMap.get(bid.project_id)),
  );
  const recentBids = allDashboardBids.slice(0, OFFER_LIST_LIMIT);
  const recentOffers = mergeRecentOffers(allDashboardBids, calculatorQuotes);

  const bidProjectIds = new Set(submittedBids.map((b) => b.project_id));

  const marketplaceAccepted = submittedBids.filter(
    (b) => b.status === "accepted",
  ).length;
  const marketplaceWaiting = submittedBids.filter(
    (b) => b.status === "submitted",
  ).length;

  const quoteStatuses = calculatorQuotes.map(quoteLifecycle);
  const quoteWon = quoteStatuses.filter((s) => s === "ordered").length;
  const quoteWaiting = quoteStatuses.filter((s) => s === "sent").length;
  const quoteSent = quoteStatuses.filter(
    (s) => s === "sent" || s === "ordered" || s === "rejected",
  ).length;

  const marketplaceCount = submittedBids.length;
  const calculatorCount = calculatorQuotes.length;
  const submittedCount = marketplaceCount + calculatorCount;
  const acceptedCount = marketplaceAccepted + quoteWon;
  // Vain Lähetetty / submitted — ei luonnoksia eikä "Valmis lähetettäväksi".
  const waitingCount = marketplaceWaiting + quoteWaiting;
  const sentCount = marketplaceCount + quoteSent;
  const conversionPercent =
    sentCount > 0
      ? Math.round((acceptedCount / sentCount) * 1000) / 10
      : null;

  return {
    recommendedProjects,
    recentBids,
    recentOffers,
    bidProjectIds,
    stats: {
      marketplaceCount,
      calculatorCount,
      submittedCount,
      acceptedCount,
      waitingCount,
      sentCount,
      conversionPercent,
      openMatchCount: counts["oma-alue"],
      openTotalCount: counts.kaikki,
    },
  };
}
