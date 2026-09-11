import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getPlatformSubscriptionPlan,
  type PlatformSubscriptionSlug,
} from "@/lib/platform-pricing";

export function isPlatformSubscriptionActive(
  subscriptionUntil: string | null | undefined,
  now = new Date(),
): boolean {
  if (!subscriptionUntil) return false;
  return new Date(subscriptionUntil).getTime() > now.getTime();
}

export async function fetchContractorSubscriptionUntil(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("contractor_profiles")
    .select("platform_subscription_until")
    .eq("id", contractorId)
    .maybeSingle();

  return data?.platform_subscription_until ?? null;
}

export async function contractorHasActivePlatformSubscription(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<boolean> {
  const until = await fetchContractorSubscriptionUntil(supabase, contractorId);
  return isPlatformSubscriptionActive(until);
}

/** Laskee uuden voimassaolopäivän maksun jälkeen (jatkaa nykyistä jaksoa). */
export function extendPlatformSubscriptionUntil(
  currentUntil: string | null | undefined,
  periodSlug: PlatformSubscriptionSlug,
  paidAt = new Date(),
): string | null {
  const plan = getPlatformSubscriptionPlan(periodSlug);
  if (!plan) return currentUntil ?? null;

  const base =
    currentUntil && isPlatformSubscriptionActive(currentUntil, paidAt)
      ? new Date(currentUntil)
      : new Date(paidAt);

  const next = new Date(base);
  next.setMonth(next.getMonth() + plan.months);
  return next.toISOString();
}
