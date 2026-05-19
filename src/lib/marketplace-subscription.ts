import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveSubscription = {
  id: string;
  plan_id: string;
  listings_published_this_period: number;
  period_end: string | null;
  plan: {
    listing_quota_per_month: number | null;
    name_fi: string;
  };
};

export async function getActiveContractorSubscription(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<ActiveSubscription | null> {
  const { data } = await supabase
    .from("seller_subscriptions")
    .select(
      `
      id,
      plan_id,
      listings_published_this_period,
      period_end,
      marketplace_plans ( name_fi, listing_quota_per_month )
    `,
    )
    .eq("contractor_id", contractorId)
    .eq("status", "active")
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const plan = Array.isArray(data.marketplace_plans)
    ? data.marketplace_plans[0]
    : data.marketplace_plans;

  if (!plan) return null;

  if (data.period_end && new Date(data.period_end) < new Date()) {
    return null;
  }

  return {
    id: data.id,
    plan_id: data.plan_id,
    listings_published_this_period: data.listings_published_this_period,
    period_end: data.period_end,
    plan: {
      name_fi: plan.name_fi,
      listing_quota_per_month: plan.listing_quota_per_month,
    },
  };
}

export function subscriptionSlotsLeft(sub: ActiveSubscription): number {
  const quota = sub.plan.listing_quota_per_month ?? 0;
  return Math.max(0, quota - sub.listings_published_this_period);
}
