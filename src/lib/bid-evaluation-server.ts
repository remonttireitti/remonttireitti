import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BidEvaluationCategory,
  BidEvaluationStatus,
  BidEvaluationVerdict,
  BidEvaluationDimension,
} from "@/lib/bid-evaluation";

export type BidEvaluationRequestRow = {
  id: string;
  customer_id: string;
  project_id: string | null;
  category: BidEvaluationCategory;
  heat_pump_type: string | null;
  context_notes: string | null;
  status: BidEvaluationStatus;
  submitted_at: string | null;
  completed_at: string | null;
  assigned_evaluator_id: string | null;
  created_at: string;
};

export type BidEvaluationItemRow = {
  id: string;
  request_id: string;
  sort_order: number;
  source: "platform" | "external";
  bid_id: string | null;
  label: string;
  amount_cents: number | null;
  device_brand: string | null;
  notes: string | null;
};

export type BidEvaluationItemScoreRow = {
  id: string;
  review_id: string;
  item_id: string;
  dimension: BidEvaluationDimension;
  score: number | null;
  verdict: BidEvaluationVerdict | null;
  note: string | null;
};

export type BidEvaluationReviewRow = {
  id: string;
  request_id: string;
  evaluator_id: string;
  summary: string | null;
  questions_for_contractor: string | null;
  completed_at: string | null;
};

export async function fetchCustomerEvaluationRequests(
  supabase: SupabaseClient,
  customerId: string,
): Promise<BidEvaluationRequestRow[]> {
  const { data } = await supabase
    .from("bid_evaluation_requests")
    .select(
      "id, customer_id, project_id, category, heat_pump_type, context_notes, status, submitted_at, completed_at, assigned_evaluator_id, created_at",
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return (data ?? []) as BidEvaluationRequestRow[];
}

export async function fetchEvaluationRequestById(
  supabase: SupabaseClient,
  requestId: string,
): Promise<BidEvaluationRequestRow | null> {
  const { data } = await supabase
    .from("bid_evaluation_requests")
    .select(
      "id, customer_id, project_id, category, heat_pump_type, context_notes, status, submitted_at, completed_at, assigned_evaluator_id, created_at",
    )
    .eq("id", requestId)
    .maybeSingle();

  return (data as BidEvaluationRequestRow | null) ?? null;
}

export async function fetchEvaluationItems(
  supabase: SupabaseClient,
  requestId: string,
): Promise<BidEvaluationItemRow[]> {
  const { data } = await supabase
    .from("bid_evaluation_items")
    .select(
      "id, request_id, sort_order, source, bid_id, label, amount_cents, device_brand, notes",
    )
    .eq("request_id", requestId)
    .order("sort_order");

  return (data ?? []) as BidEvaluationItemRow[];
}

export async function fetchEvaluationReview(
  supabase: SupabaseClient,
  requestId: string,
): Promise<BidEvaluationReviewRow | null> {
  const { data } = await supabase
    .from("bid_evaluation_reviews")
    .select("id, request_id, evaluator_id, summary, questions_for_contractor, completed_at")
    .eq("request_id", requestId)
    .maybeSingle();

  return (data as BidEvaluationReviewRow | null) ?? null;
}

export async function fetchEvaluationScores(
  supabase: SupabaseClient,
  reviewId: string,
): Promise<BidEvaluationItemScoreRow[]> {
  const { data } = await supabase
    .from("bid_evaluation_item_scores")
    .select("id, review_id, item_id, dimension, score, verdict, note")
    .eq("review_id", reviewId);

  return (data ?? []) as BidEvaluationItemScoreRow[];
}

export async function fetchEvaluatorQueue(
  supabase: SupabaseClient,
  categories: string[],
): Promise<BidEvaluationRequestRow[]> {
  if (categories.length === 0) return [];

  const { data } = await supabase
    .from("bid_evaluation_requests")
    .select(
      "id, customer_id, project_id, category, heat_pump_type, context_notes, status, submitted_at, completed_at, assigned_evaluator_id, created_at",
    )
    .in("category", categories)
    .in("status", ["submitted", "in_review"])
    .order("submitted_at", { ascending: true });

  return (data ?? []) as BidEvaluationRequestRow[];
}
