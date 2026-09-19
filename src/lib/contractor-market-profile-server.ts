import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildBidConversionProfile,
  toBidConversionDisplay,
  type ContractorMarketSignals,
} from "@/lib/contractor-market-profile";
import {
  buildResponseTimeProfile,
  minutesBetween,
  toResponseTimeDisplay,
} from "@/lib/contractor-response-time";

const RESPONSE_TIME_FETCH_LIMIT = 120;

type BidStatusRow = {
  contractor_id: string;
  status: string;
};

type BidResponseRow = {
  contractor_id: string;
  submitted_at: string;
  projects: { published_at: string | null } | { published_at: string | null }[] | null;
};

function emptySignals(): ContractorMarketSignals {
  return {
    conversion: { kind: "none" },
    responseTime: { kind: "none" },
  };
}

function aggregateConversion(rows: BidStatusRow[]): Map<string, { submitted: number; accepted: number }> {
  const map = new Map<string, { submitted: number; accepted: number }>();

  for (const row of rows) {
    const bucket = map.get(row.contractor_id) ?? { submitted: 0, accepted: 0 };
    bucket.submitted += 1;
    if (row.status === "accepted") {
      bucket.accepted += 1;
    }
    map.set(row.contractor_id, bucket);
  }

  return map;
}

function aggregateResponseMinutes(rows: BidResponseRow[]): Map<string, number[]> {
  const map = new Map<string, number[]>();

  for (const row of rows) {
    const projects = row.projects;
    const project = Array.isArray(projects) ? projects[0] : projects;
    const publishedAt = project?.published_at;
    if (!publishedAt || !row.submitted_at) continue;

    const minutes = minutesBetween(publishedAt, row.submitted_at);
    if (minutes == null) continue;

    const list = map.get(row.contractor_id) ?? [];
    list.push(minutes);
    map.set(row.contractor_id, list);
  }

  return map;
}

/** Hae urakoitsijoiden neutraalit markkinasignaalit tarjousvertailuun. */
export async function fetchContractorMarketSignals(
  supabase: SupabaseClient,
  contractorIds: string[],
): Promise<Record<string, ContractorMarketSignals>> {
  const result: Record<string, ContractorMarketSignals> = {};
  if (contractorIds.length === 0) return result;

  for (const id of contractorIds) {
    result[id] = emptySignals();
  }

  const [conversionRes, responseRes] = await Promise.all([
    supabase
      .from("bids")
      .select("contractor_id, status")
      .in("contractor_id", contractorIds)
      .not("submitted_at", "is", null)
      .in("status", ["submitted", "accepted", "rejected"]),
    supabase
      .from("bids")
      .select(
        "contractor_id, submitted_at, projects ( published_at )",
      )
      .in("contractor_id", contractorIds)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(RESPONSE_TIME_FETCH_LIMIT * contractorIds.length),
  ]);

  if (conversionRes.error) {
    console.error("[market-signals/conversion]", conversionRes.error.message);
  } else {
    const conversionMap = aggregateConversion(
      (conversionRes.data ?? []) as BidStatusRow[],
    );
    for (const [contractorId, counts] of conversionMap) {
      const profile = buildBidConversionProfile(
        counts.submitted,
        counts.accepted,
      );
      result[contractorId] = {
        ...result[contractorId]!,
        conversion: toBidConversionDisplay(profile),
      };
    }
  }

  if (responseRes.error) {
    console.error("[market-signals/response]", responseRes.error.message);
  } else {
    const responseMap = aggregateResponseMinutes(
      (responseRes.data ?? []) as BidResponseRow[],
    );
    for (const [contractorId, minutes] of responseMap) {
      const profile = buildResponseTimeProfile(minutes);
      result[contractorId] = {
        ...result[contractorId]!,
        responseTime: toResponseTimeDisplay(profile),
      };
    }
  }

  return result;
}

/** Yhden urakoitsijan signaalit (julkinen profiili). */
export async function fetchContractorMarketSignalsForOne(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<ContractorMarketSignals> {
  const map = await fetchContractorMarketSignals(supabase, [contractorId]);
  return map[contractorId] ?? emptySignals();
}
