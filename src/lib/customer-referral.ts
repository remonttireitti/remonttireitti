import { isAuthUserEmailVerified } from "@/lib/auth-email-verified";
import { contractorReferralFreeDealsRemainingFor } from "@/lib/contractor-referral";
import {
  isValidReferrerEmail,
  lookupContractorIdByEmail,
  normalizeReferrerEmail,
  recordContractorReferral,
} from "@/lib/contractor-referral";
import { payPerDealFeeCents } from "@/lib/platform-fee";
import { resolvePlatformFeeForContractor } from "@/lib/platform-fee-beta";
import type { PlatformFeeWaiverReason } from "@/lib/platform-fee-waiver";
import { countContractorPlatformInvoices } from "@/lib/platform-invoice-finalize-server";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type CustomerReferralCreditRow = {
  id: string;
  customer_id: string;
  amount_cents: number;
  status: "available" | "used" | "cancelled";
  earned_from_project_id: string;
  used_on_project_id: string | null;
  used_on_invoice_id: string | null;
  created_at: string;
  used_at: string | null;
};

export async function lookupCustomerIdByEmail(
  admin: AdminClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.rpc("get_customer_id_by_email", {
    p_email: normalizeReferrerEmail(email),
  });

  if (error) {
    console.error("[customer-referral] lookup failed", error.message);
    return null;
  }

  return typeof data === "string" ? data : null;
}

export async function recordCustomerReferral(
  admin: AdminClient,
  params: {
    referredCustomerId: string;
    referrerEmail: string;
  },
): Promise<{
  error?: string;
  created?: boolean;
  referrerCustomerId?: string;
}> {
  const normalizedEmail = normalizeReferrerEmail(params.referrerEmail);
  const referrerId = await lookupCustomerIdByEmail(admin, normalizedEmail);

  if (!referrerId) {
    return {
      error:
        "Suosittelijaa ei löydy — tarkista sähköposti tai varmista että suosittelijan tili on vahvistettu.",
    };
  }

  if (referrerId === params.referredCustomerId) {
    return { error: "Et voi suosittaa itseäsi." };
  }

  const { error } = await admin.from("customer_referrals").insert({
    referrer_customer_id: referrerId,
    referred_customer_id: params.referredCustomerId,
    referrer_email_at_signup: normalizedEmail,
  });

  if (error) {
    if (error.code === "23505") return { created: false };
    console.error("[customer-referral] insert failed", error.message);
    return { error: "Suosittelun tallennus epäonnistui." };
  }

  return { created: true, referrerCustomerId: referrerId };
}

export async function ensureCustomerReferralFromMetadata(
  admin: AdminClient,
  userId: string,
  referrerEmail: string | null | undefined,
): Promise<{ created: boolean; referrerCustomerId?: string }> {
  const email = referrerEmail?.trim();
  if (!email || !isValidReferrerEmail(email)) return { created: false };

  const res = await recordCustomerReferral(admin, {
    referredCustomerId: userId,
    referrerEmail: email,
  });
  if (res.error) return { created: false };
  return {
    created: res.created ?? false,
    referrerCustomerId: res.referrerCustomerId,
  };
}

export async function recordCustomerContractorReferral(
  admin: AdminClient,
  params: {
    referredContractorId: string;
    referrerEmail: string;
  },
): Promise<{
  error?: string;
  created?: boolean;
  referrerCustomerId?: string;
}> {
  const normalizedEmail = normalizeReferrerEmail(params.referrerEmail);
  const referrerId = await lookupCustomerIdByEmail(admin, normalizedEmail);

  if (!referrerId) {
    return {
      error:
        "Suosittelijaa ei löydy — tarkista sähköposti tai varmista että suosittelijan tili on vahvistettu.",
    };
  }

  if (referrerId === params.referredContractorId) {
    return { error: "Et voi suosittaa itseäsi." };
  }

  const { error } = await admin.from("customer_contractor_referrals").insert({
    referrer_customer_id: referrerId,
    referred_contractor_id: params.referredContractorId,
    referrer_email_at_signup: normalizedEmail,
  });

  if (error) {
    if (error.code === "23505") return { created: false };
    console.error("[customer-referral] contractor insert failed", error.message);
    return { error: "Suosittelun tallennus epäonnistui." };
  }

  return { created: true, referrerCustomerId: referrerId };
}

/** Urakoitsijarekisteröinti: suosittelija voi olla urakoitsija tai asiakas. */
export async function recordContractorSignupReferral(
  admin: AdminClient,
  params: {
    referredContractorId: string;
    referrerEmail: string;
  },
): Promise<{
  error?: string;
  created?: boolean;
  kind?: "contractor" | "customer_contractor";
  referrerCustomerId?: string;
  referrerContractorId?: string;
}> {
  const normalizedEmail = normalizeReferrerEmail(params.referrerEmail);

  const contractorReferrerId = await lookupContractorIdByEmail(
    admin,
    normalizedEmail,
  );
  if (contractorReferrerId) {
    if (contractorReferrerId === params.referredContractorId) {
      return { error: "Et voi suosittaa itseäsi." };
    }
    const res = await recordContractorReferral(admin, {
      referredContractorId: params.referredContractorId,
      referrerEmail: params.referrerEmail,
    });
    if (res.error) return res;
    return {
      created: res.created,
      kind: "contractor",
      referrerContractorId: res.referrerContractorId,
    };
  }

  const customerReferrerId = await lookupCustomerIdByEmail(admin, normalizedEmail);
  if (customerReferrerId) {
    if (customerReferrerId === params.referredContractorId) {
      return { error: "Et voi suosittaa itseäsi." };
    }
    const res = await recordCustomerContractorReferral(admin, {
      referredContractorId: params.referredContractorId,
      referrerEmail: params.referrerEmail,
    });
    if (res.error) return res;
    return {
      created: res.created,
      kind: "customer_contractor",
      referrerCustomerId: res.referrerCustomerId,
    };
  }

  return {
    error:
      "Suosittelijaa ei löydy — anna vahvistetun urakoitsijan tai asiakkaan sähköposti.",
  };
}

export async function ensureContractorSignupReferralFromMetadata(
  admin: AdminClient,
  contractorId: string,
  referrerEmail: string | null | undefined,
): Promise<{
  created: boolean;
  referrerCustomerId?: string;
  referrerContractorId?: string;
  kind?: "contractor" | "customer_contractor";
}> {
  const email = referrerEmail?.trim();
  if (!email || !isValidReferrerEmail(email)) return { created: false };

  const res = await recordContractorSignupReferral(admin, {
    referredContractorId: contractorId,
    referrerEmail: email,
  });
  if (res.error) return { created: false };
  return {
    created: res.created ?? false,
    referrerCustomerId: res.referrerCustomerId,
    referrerContractorId: res.referrerContractorId,
    kind: res.kind,
  };
}

export async function referrerExistsForContractorSignup(
  admin: AdminClient,
  referrerEmail: string,
): Promise<boolean> {
  const normalized = normalizeReferrerEmail(referrerEmail);
  const contractorId = await lookupContractorIdByEmail(admin, normalized);
  if (contractorId) return true;
  const customerId = await lookupCustomerIdByEmail(admin, normalized);
  return Boolean(customerId);
}

export async function resolveContractorPlatformFeeForDeal(
  admin: AdminClient,
  contractorId: string,
): Promise<{ feeCents: number; waiverReason: PlatformFeeWaiverReason | null }> {
  const [priorInvoiceCount, hasActiveSubscription, referralFreeDealsRemaining] =
    await Promise.all([
      countContractorPlatformInvoices(admin, contractorId),
      import("@/lib/platform-subscription").then((m) =>
        m.contractorHasActivePlatformSubscription(admin, contractorId),
      ),
      contractorReferralFreeDealsRemainingFor(admin, contractorId),
    ]);

  return resolvePlatformFeeForContractor({
    priorInvoiceCount,
    hasActiveSubscription,
    referralFreeDealsRemaining,
  });
}

/** Asiakkaan bonus vain jos urakoitsija maksaisi muuten välityspalkkion. */
export async function contractorPaysPlatformFeeForDeal(
  admin: AdminClient,
  contractorId: string,
): Promise<boolean> {
  const { feeCents } = await resolveContractorPlatformFeeForDeal(
    admin,
    contractorId,
  );
  return feeCents > 0;
}

export type BidAcceptanceFeeResolution = {
  feeCents: number;
  waiverReason: PlatformFeeWaiverReason | null;
  customerReferralCredit: CustomerReferralCreditRow | null;
  customerReferralDiscountCents: number;
  appliedCustomerReferral: boolean;
};

export async function resolvePlatformFeeForBidAcceptance(
  admin: AdminClient,
  params: {
    contractorId: string;
    customerId: string;
  },
): Promise<BidAcceptanceFeeResolution> {
  const [contractorFee, customerReferralCredit] = await Promise.all([
    resolveContractorPlatformFeeForDeal(admin, params.contractorId),
    fetchAvailableCustomerReferralCredit(admin, params.customerId),
  ]);

  if (contractorFee.feeCents === 0) {
    return {
      feeCents: 0,
      waiverReason: contractorFee.waiverReason,
      customerReferralCredit: null,
      customerReferralDiscountCents: 0,
      appliedCustomerReferral: false,
    };
  }

  if (customerReferralCredit) {
    return {
      feeCents: 0,
      waiverReason: "customer_referral",
      customerReferralCredit,
      customerReferralDiscountCents: customerReferralCredit.amount_cents,
      appliedCustomerReferral: true,
    };
  }

  return {
    feeCents: contractorFee.feeCents,
    waiverReason: null,
    customerReferralCredit: null,
    customerReferralDiscountCents: 0,
    appliedCustomerReferral: false,
  };
}

export async function fetchAvailableCustomerReferralCredit(
  admin: AdminClient,
  customerId: string,
): Promise<CustomerReferralCreditRow | null> {
  const { data, error } = await admin
    .from("customer_referral_credits")
    .select(
      "id, customer_id, amount_cents, status, earned_from_project_id, used_on_project_id, used_on_invoice_id, created_at, used_at",
    )
    .eq("customer_id", customerId)
    .eq("status", "available")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[customer-referral] fetch credit failed", error.message);
    return null;
  }

  return data as CustomerReferralCreditRow | null;
}

export async function countAvailableCustomerReferralCredits(
  admin: AdminClient,
  customerId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("customer_referral_credits")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("status", "available");

  if (error) return 0;
  return count ?? 0;
}

export async function consumeCustomerReferralCredit(
  admin: AdminClient,
  params: {
    creditId: string;
    customerId: string;
    usedOnProjectId: string;
    usedOnInvoiceId: string;
  },
): Promise<{ error?: string }> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("customer_referral_credits")
    .update({
      status: "used",
      used_on_project_id: params.usedOnProjectId,
      used_on_invoice_id: params.usedOnInvoiceId,
      used_at: now,
    })
    .eq("id", params.creditId)
    .eq("customer_id", params.customerId)
    .eq("status", "available");

  if (error) {
    console.error("[customer-referral] consume failed", error.message);
    return { error: "Suosittelubonuksen käyttö epäonnistui." };
  }

  return {};
}

/** Bonus kun suositeltu asiakas on julkaissut tarjouspyynnön ja se on saanut tarjouksia. */
export async function grantCustomerReferralCreditForProjectWithBids(
  admin: AdminClient,
  params: {
    referredCustomerId: string;
    sourceProjectId: string;
  },
): Promise<{ granted: boolean; referrerCustomerId?: string; amountCents?: number }> {
  const { data: referral } = await admin
    .from("customer_referrals")
    .select("id, referrer_customer_id")
    .eq("referred_customer_id", params.referredCustomerId)
    .maybeSingle();

  if (!referral) return { granted: false };

  const [referredVerified, referrerVerified] = await Promise.all([
    isAuthUserEmailVerified(admin, params.referredCustomerId),
    isAuthUserEmailVerified(admin, referral.referrer_customer_id),
  ]);
  if (!referredVerified || !referrerVerified) return { granted: false };

  const amountCents = payPerDealFeeCents();

  const { error } = await admin.from("customer_referral_credits").insert({
    customer_id: referral.referrer_customer_id,
    customer_referral_id: referral.id,
    amount_cents: amountCents,
    earned_from_project_id: params.sourceProjectId,
    status: "available",
  });

  if (error) {
    if (error.code === "23505") return { granted: false };
    console.error("[customer-referral] grant failed", error.message);
    return { granted: false };
  }

  return {
    granted: true,
    referrerCustomerId: referral.referrer_customer_id,
    amountCents,
  };
}

export async function grantCustomerReferralCreditForContractorDeal(
  admin: AdminClient,
  params: {
    referredContractorId: string;
    sourceProjectId: string;
  },
): Promise<{ granted: boolean; referrerCustomerId?: string; amountCents?: number }> {
  const { data: referral } = await admin
    .from("customer_contractor_referrals")
    .select("id, referrer_customer_id")
    .eq("referred_contractor_id", params.referredContractorId)
    .maybeSingle();

  if (!referral) return { granted: false };

  const [referredVerified, referrerVerified] = await Promise.all([
    isAuthUserEmailVerified(admin, params.referredContractorId),
    isAuthUserEmailVerified(admin, referral.referrer_customer_id),
  ]);
  if (!referredVerified || !referrerVerified) return { granted: false };

  const amountCents = payPerDealFeeCents();

  const { error } = await admin.from("customer_referral_credits").insert({
    customer_id: referral.referrer_customer_id,
    customer_contractor_referral_id: referral.id,
    amount_cents: amountCents,
    earned_from_project_id: params.sourceProjectId,
    status: "available",
  });

  if (error) {
    if (error.code === "23505") return { granted: false };
    console.error("[customer-referral] contractor grant failed", error.message);
    return { granted: false };
  }

  return {
    granted: true,
    referrerCustomerId: referral.referrer_customer_id,
    amountCents,
  };
}
