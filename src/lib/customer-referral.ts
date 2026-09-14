import { payPerDealFeeCents } from "@/lib/platform-fee";
import {
  isValidReferrerEmail,
  lookupContractorIdByEmail,
  normalizeReferrerEmail,
  recordContractorReferral,
} from "@/lib/contractor-referral";
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
): Promise<{ error?: string }> {
  const normalizedEmail = normalizeReferrerEmail(params.referrerEmail);
  const referrerId = await lookupCustomerIdByEmail(admin, normalizedEmail);

  if (!referrerId) {
    return {
      error:
        "Suosittelijaa ei löydy — tarkista että sähköposti kuuluu jo rekisteröityneelle asiakkaalle.",
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
    if (error.code === "23505") return {};
    console.error("[customer-referral] insert failed", error.message);
    return { error: "Suosittelun tallennus epäonnistui." };
  }

  return {};
}

export async function ensureCustomerReferralFromMetadata(
  admin: AdminClient,
  userId: string,
  referrerEmail: string | null | undefined,
): Promise<void> {
  const email = referrerEmail?.trim();
  if (!email || !isValidReferrerEmail(email)) return;

  await recordCustomerReferral(admin, {
    referredCustomerId: userId,
    referrerEmail: email,
  });
}

export async function recordCustomerContractorReferral(
  admin: AdminClient,
  params: {
    referredContractorId: string;
    referrerEmail: string;
  },
): Promise<{ error?: string }> {
  const normalizedEmail = normalizeReferrerEmail(params.referrerEmail);
  const referrerId = await lookupCustomerIdByEmail(admin, normalizedEmail);

  if (!referrerId) {
    return {
      error:
        "Suosittelijaa ei löydy — tarkista että sähköposti kuuluu jo rekisteröityneelle asiakkaalle.",
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
    if (error.code === "23505") return {};
    console.error("[customer-referral] contractor insert failed", error.message);
    return { error: "Suosittelun tallennus epäonnistui." };
  }

  return {};
}

/** Urakoitsijarekisteröinti: suosittelija voi olla urakoitsija tai asiakas. */
export async function recordContractorSignupReferral(
  admin: AdminClient,
  params: {
    referredContractorId: string;
    referrerEmail: string;
  },
): Promise<{ error?: string; kind?: "contractor" | "customer" }> {
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
    return res.error ? res : { kind: "contractor" };
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
    return res.error ? res : { kind: "customer" };
  }

  return {
    error:
      "Suosittelijaa ei löydy — anna rekisteröityneen urakoitsijan tai asiakkaan sähköposti.",
  };
}

export async function ensureContractorSignupReferralFromMetadata(
  admin: AdminClient,
  contractorId: string,
  referrerEmail: string | null | undefined,
): Promise<void> {
  const email = referrerEmail?.trim();
  if (!email || !isValidReferrerEmail(email)) return;

  await recordContractorSignupReferral(admin, {
    referredContractorId: contractorId,
    referrerEmail: email,
  });
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

export async function grantCustomerReferralCreditForAcceptedDeal(
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
