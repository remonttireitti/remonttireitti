import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export const REFERRAL_FREE_DEALS_PER_REFERRAL = 2;

export function normalizeReferrerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidReferrerEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeReferrerEmail(email));
}

export async function lookupContractorIdByEmail(
  admin: AdminClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.rpc("get_contractor_id_by_email", {
    p_email: normalizeReferrerEmail(email),
  });

  if (error) {
    console.error("[contractor-referral] lookup failed", error.message);
    return null;
  }

  return typeof data === "string" ? data : null;
}

export async function countContractorReferralsMade(
  admin: AdminClient,
  referrerContractorId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("contractor_referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_contractor_id", referrerContractorId);

  if (error) {
    console.error("[contractor-referral] count referrals failed", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function countReferralWaiverInvoices(
  admin: AdminClient,
  contractorId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("platform_invoices")
    .select("id", { count: "exact", head: true })
    .eq("contractor_id", contractorId)
    .eq("fee_waiver_reason", "referral")
    .neq("status", "cancelled");

  if (error) {
    console.error("[contractor-referral] count waiver invoices failed", error.message);
    return 0;
  }

  return count ?? 0;
}

export function contractorReferralFreeDealsRemaining(
  referralCount: number,
  usedReferralDeals: number,
  freeDealsPerReferral = REFERRAL_FREE_DEALS_PER_REFERRAL,
): number {
  return Math.max(0, referralCount * freeDealsPerReferral - usedReferralDeals);
}

export async function contractorReferralFreeDealsRemainingFor(
  admin: AdminClient,
  contractorId: string,
): Promise<number> {
  const [referralCount, usedReferralDeals] = await Promise.all([
    countContractorReferralsMade(admin, contractorId),
    countReferralWaiverInvoices(admin, contractorId),
  ]);

  return contractorReferralFreeDealsRemaining(referralCount, usedReferralDeals);
}

export async function recordContractorReferral(
  admin: AdminClient,
  params: {
    referredContractorId: string;
    referrerEmail: string;
  },
): Promise<{ error?: string }> {
  const normalizedEmail = normalizeReferrerEmail(params.referrerEmail);
  const referrerId = await lookupContractorIdByEmail(admin, normalizedEmail);

  if (!referrerId) {
    return {
      error:
        "Suosittelijaa ei löydy — tarkista että sähköposti kuuluu jo rekisteröityneelle urakoitsijalle.",
    };
  }

  if (referrerId === params.referredContractorId) {
    return { error: "Et voi suosittaa itseäsi." };
  }

  const { error } = await admin.from("contractor_referrals").insert({
    referrer_contractor_id: referrerId,
    referred_contractor_id: params.referredContractorId,
    referrer_email_at_signup: normalizedEmail,
    free_deals_per_referral: REFERRAL_FREE_DEALS_PER_REFERRAL,
  });

  if (error) {
    if (error.code === "23505") return {};
    console.error("[contractor-referral] insert failed", error.message);
    return { error: "Suosittelun tallennus epäonnistui." };
  }

  return {};
}

export async function ensureContractorReferralFromMetadata(
  admin: AdminClient,
  userId: string,
  referrerEmail: string | null | undefined,
): Promise<void> {
  const email = referrerEmail?.trim();
  if (!email || !isValidReferrerEmail(email)) return;

  await recordContractorReferral(admin, {
    referredContractorId: userId,
    referrerEmail: email,
  });
}
