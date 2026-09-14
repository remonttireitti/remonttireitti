import { isUnverifiedGuestProjectExpired } from "@/lib/guest-project-verification";
import { deleteUnverifiedListing } from "@/lib/expire-unverified-listings";
import { hashProjectAccessToken } from "@/lib/project-guest-access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export type PendingListingRow = {
  id: string;
  seller_id: string | null;
  guest_seller_email: string | null;
  seller_type: string;
  status: string;
  title: string;
  contact_email: string;
  created_at: string;
  contact_email_verified_at: string | null;
  pending_publish: boolean;
};

export async function fetchPendingListingByToken(
  listingId: string,
  rawToken: string,
): Promise<PendingListingRow | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;

  const hash = hashProjectAccessToken(rawToken);
  const { data, error } = await admin
    .from("equipment_listings")
    .select(
      "id, seller_id, guest_seller_email, seller_type, status, title, contact_email, created_at, contact_email_verified_at, pending_publish",
    )
    .eq("id", listingId)
    .eq("verification_token_hash", hash)
    .eq("seller_type", "customer")
    .maybeSingle();

  if (error) {
    console.error("[fetchPendingListingByToken]", error.code, error.message);
    return null;
  }

  if (!data) return null;

  if (
    isUnverifiedGuestProjectExpired({
      email_verified_at: data.contact_email_verified_at,
      created_at: data.created_at,
    })
  ) {
    await deleteUnverifiedListing(listingId);
    return null;
  }

  return data as PendingListingRow;
}
