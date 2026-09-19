import type { SupabaseClient } from "@supabase/supabase-js";
import { bidTotalAmountCents } from "@/lib/bid-amounts";
import {
  statsPeriodBounds,
  type ContractorQuoteStatsPeriod,
} from "@/lib/contractor-quote-period";

export type QuoteStatsBucket = {
  sentCount: number;
  sentSumCents: number;
  orderedCount: number;
  orderedSumCents: number;
  conversionPercent: number | null;
};

export type ContractorQuoteStats = {
  period: ContractorQuoteStatsPeriod;
  periodLabel: string;
  remonttireitti: QuoteStatsBucket;
  standalone: QuoteStatsBucket & { pendingCount: number };
  yhteensa: QuoteStatsBucket;
};

function bucket(
  sentCount: number,
  sentSumCents: number,
  orderedCount: number,
  orderedSumCents: number,
): QuoteStatsBucket {
  const conversionPercent =
    sentCount > 0
      ? Math.round((orderedCount / sentCount) * 1000) / 10
      : null;
  return { sentCount, sentSumCents, orderedCount, orderedSumCents, conversionPercent };
}

function addBuckets(a: QuoteStatsBucket, b: QuoteStatsBucket): QuoteStatsBucket {
  return bucket(
    a.sentCount + b.sentCount,
    a.sentSumCents + b.sentSumCents,
    a.orderedCount + b.orderedCount,
    a.orderedSumCents + b.orderedSumCents,
  );
}

type BidRow = {
  id: string;
  amount_cents: number;
  offers_equipment: boolean | null;
  equipment_amount_cents: number | null;
  status: string;
  submitted_at: string | null;
};

export async function fetchContractorQuoteStats(
  supabase: SupabaseClient,
  contractorId: string,
  period: ContractorQuoteStatsPeriod,
): Promise<ContractorQuoteStats> {
  const bounds = statsPeriodBounds(period);
  const { startIso, endIso } = bounds;

  const [bidsRes, exportsRes, wonQuotesRes, acceptedProjectsRes] = await Promise.all([
    supabase
      .from("bids")
      .select(
        "id, amount_cents, offers_equipment, equipment_amount_cents, status, submitted_at",
      )
      .eq("contractor_id", contractorId)
      .not("submitted_at", "is", null)
      .gte("submitted_at", startIso)
      .lte("submitted_at", endIso),
    supabase
      .from("contractor_quote_pdf_exports")
      .select(
        `
        id,
        quote_id,
        exported_at,
        contractor_quotes (
          total_cents,
          outcome,
          outcome_updated_at
        )
      `,
      )
      .eq("contractor_id", contractorId)
      .gte("exported_at", startIso)
      .lte("exported_at", endIso),
    supabase
      .from("contractor_quotes")
      .select("id, total_cents, outcome_updated_at")
      .eq("contractor_id", contractorId)
      .eq("outcome", "won")
      .not("outcome_updated_at", "is", null)
      .gte("outcome_updated_at", startIso)
      .lte("outcome_updated_at", endIso),
    supabase
      .from("projects")
      .select("id, accepted_bid_id, bid_accepted_at")
      .not("accepted_bid_id", "is", null)
      .not("bid_accepted_at", "is", null)
      .gte("bid_accepted_at", startIso)
      .lte("bid_accepted_at", endIso),
  ]);

  const bids = (bidsRes.data ?? []) as BidRow[];
  const rrSentCount = bids.length;
  const rrSentSum = bids.reduce(
    (sum, b) => sum + bidTotalAmountCents(b),
    0,
  );

  const acceptedBidIds = (acceptedProjectsRes.data ?? [])
    .map((p) => p.accepted_bid_id as string)
    .filter(Boolean);

  let rrOrderedCount = 0;
  let rrOrderedSum = 0;
  if (acceptedBidIds.length > 0) {
    const { data: acceptedBids } = await supabase
      .from("bids")
      .select(
        "id, amount_cents, offers_equipment, equipment_amount_cents",
      )
      .eq("contractor_id", contractorId)
      .in("id", acceptedBidIds);

    rrOrderedCount = acceptedBids?.length ?? 0;
    rrOrderedSum = (acceptedBids ?? []).reduce(
      (sum, b) => sum + bidTotalAmountCents(b),
      0,
    );
  }

  const remonttireitti = bucket(
    rrSentCount,
    rrSentSum,
    rrOrderedCount,
    rrOrderedSum,
  );

  const seenQuoteIds = new Set<string>();
  let standaloneSentCount = 0;
  let standaloneSentSum = 0;
  let standalonePending = 0;

  for (const row of exportsRes.data ?? []) {
    const quoteId = row.quote_id as string;
    if (seenQuoteIds.has(quoteId)) continue;
    seenQuoteIds.add(quoteId);

    const quote = Array.isArray(row.contractor_quotes)
      ? row.contractor_quotes[0]
      : row.contractor_quotes;
    if (!quote) continue;

    standaloneSentCount += 1;
    standaloneSentSum += Number(quote.total_cents) || 0;
    if (quote.outcome === "pending") standalonePending += 1;
  }

  const wonQuotes = wonQuotesRes.data ?? [];
  const standaloneOrderedCount = wonQuotes.length;
  const standaloneOrderedSum = wonQuotes.reduce(
    (sum, q) => sum + (Number(q.total_cents) || 0),
    0,
  );

  const standalone = {
    ...bucket(
      standaloneSentCount,
      standaloneSentSum,
      standaloneOrderedCount,
      standaloneOrderedSum,
    ),
    pendingCount: standalonePending,
  };

  const yhteensa = addBuckets(remonttireitti, standalone);

  return {
    period,
    periodLabel: bounds.label,
    remonttireitti,
    standalone,
    yhteensa,
  };
}

export type ContractorQuoteListItem = {
  id: string;
  title: string;
  total_cents: number;
  client_name: string | null;
  pdf_generated_at: string | null;
  outcome: "pending" | "won" | "lost";
  outcome_updated_at: string | null;
  remonttireitti_project_id: string | null;
  updated_at: string;
};

export async function fetchContractorQuotesForStats(
  supabase: SupabaseClient,
  contractorId: string,
  limit = 15,
): Promise<ContractorQuoteListItem[]> {
  const { data } = await supabase
    .from("contractor_quotes")
    .select(
      "id, title, total_cents, client_name, pdf_generated_at, outcome, outcome_updated_at, remonttireitti_project_id, updated_at",
    )
    .eq("contractor_id", contractorId)
    .not("pdf_generated_at", "is", null)
    .order("pdf_generated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    total_cents: Number(row.total_cents),
    client_name: row.client_name as string | null,
    pdf_generated_at: row.pdf_generated_at as string | null,
    outcome: (row.outcome as ContractorQuoteListItem["outcome"]) ?? "pending",
    outcome_updated_at: row.outcome_updated_at as string | null,
    remonttireitti_project_id: row.remonttireitti_project_id as string | null,
    updated_at: row.updated_at as string,
  }));
}
