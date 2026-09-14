import { isEmailVerifiedUser } from "@/lib/auth-email-verified";
import {
  ensureContractorSignupReferralFromMetadata,
  ensureCustomerReferralFromMetadata,
} from "@/lib/customer-referral";
import { notifySuspiciousReferralIfNeeded } from "@/lib/referral-abuse-notify";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

/** Tallenna suosittelut metadatasta vasta sähköpostivahvistuksen jälkeen. */
export async function syncUserReferrals(user: User): Promise<void> {
  if (!isEmailVerifiedUser(user)) return;

  const admin = tryCreateAdminClient();
  if (!admin) return;

  const meta = user.user_metadata ?? {};
  const role = meta.role as string | undefined;

  const customerReferrerEmail =
    typeof meta.customer_referrer_email === "string"
      ? meta.customer_referrer_email
      : null;

  const contractorReferrerEmail =
    typeof meta.referrer_email === "string" ? meta.referrer_email : null;

  if (role === "customer" && customerReferrerEmail) {
    const result = await ensureCustomerReferralFromMetadata(
      admin,
      user.id,
      customerReferrerEmail,
    );
    if (result.created) {
      await notifySuspiciousReferralIfNeeded(admin, {
        referrerEmail: customerReferrerEmail,
        referredUserId: user.id,
        referrerCustomerId: result.referrerCustomerId,
        kind: "customer",
      });
    }
  }

  if (role === "contractor" && contractorReferrerEmail) {
    const result = await ensureContractorSignupReferralFromMetadata(
      admin,
      user.id,
      contractorReferrerEmail,
    );
    if (result.created) {
      await notifySuspiciousReferralIfNeeded(admin, {
        referrerEmail: contractorReferrerEmail,
        referredUserId: user.id,
        referrerCustomerId: result.referrerCustomerId,
        referrerContractorId: result.referrerContractorId,
        kind: result.kind ?? "contractor",
      });
    }
  }
}
