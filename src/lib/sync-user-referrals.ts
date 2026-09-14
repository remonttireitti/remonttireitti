import { ensureCustomerReferralFromMetadata } from "@/lib/customer-referral";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

/** Tallenna asiakkaan suosittelu metadatasta (esim. sähköpostivahvistuksen jälkeen). */
export async function syncUserReferrals(user: User): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) return;

  const meta = user.user_metadata ?? {};
  const customerReferrerEmail =
    typeof meta.customer_referrer_email === "string"
      ? meta.customer_referrer_email
      : null;

  if (customerReferrerEmail) {
    await ensureCustomerReferralFromMetadata(
      admin,
      user.id,
      customerReferrerEmail,
    );
  }
}
