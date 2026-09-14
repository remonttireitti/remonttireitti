import { isUnverifiedGuestProjectExpired } from "@/lib/guest-project-verification";
import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";

const BUCKET = "listing-photos";

type UnverifiedListingRow = {
  id: string;
  created_at: string;
  contact_email_verified_at: string | null;
  status: string;
  pending_publish: boolean;
  seller_type: string;
};

async function deleteListingStoragePhotos(listingId: string): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) return;

  const { data: rows } = await admin
    .from("equipment_listing_photos")
    .select("storage_path")
    .eq("listing_id", listingId);

  if (rows?.length) {
    await admin.storage
      .from(BUCKET)
      .remove(rows.map((r) => r.storage_path));
    await admin.from("equipment_listing_photos").delete().eq("listing_id", listingId);
  }
}

/** Poistaa vahvistusta odottavan luonnoksen (myyjän peruutus). */
export async function deletePendingListing(listingId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: listing } = await admin
    .from("equipment_listings")
    .select("id, status, pending_publish, seller_type")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) return false;
  if (listing.seller_type !== "customer") return false;
  if (listing.status !== "draft" || !listing.pending_publish) return false;

  await deleteListingStoragePhotos(listingId);

  const { error } = await admin.from("equipment_listings").delete().eq("id", listingId);
  if (error) {
    console.error("[deletePendingListing]", listingId, error.message);
    return false;
  }

  return true;
}

export async function deleteUnverifiedListing(listingId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: listing } = await admin
    .from("equipment_listings")
    .select(
      "id, created_at, contact_email_verified_at, status, pending_publish, seller_type",
    )
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) return false;
  if (listing.seller_type !== "customer") return false;
  if (listing.status !== "draft" || !listing.pending_publish) return false;
  if (listing.contact_email_verified_at) return false;
  if (!isUnverifiedGuestProjectExpired(listing)) return false;

  await deleteListingStoragePhotos(listingId);

  const { error } = await admin.from("equipment_listings").delete().eq("id", listingId);
  if (error) {
    console.error("[deleteUnverifiedListing]", listingId, error.message);
    return false;
  }

  return true;
}

/** Poistaa vahvistamattomat kuluttajailmoitukset (yli 24 h). */
export async function expireAllUnverifiedListings(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await admin
    .from("equipment_listings")
    .select(
      "id, created_at, contact_email_verified_at, status, pending_publish, seller_type",
    )
    .eq("seller_type", "customer")
    .eq("status", "draft")
    .eq("pending_publish", true)
    .is("contact_email_verified_at", null)
    .lt("created_at", cutoff);

  if (error) {
    console.error("[expireAllUnverifiedListings]", error.message);
    return 0;
  }

  let deleted = 0;
  for (const row of (rows ?? []) as UnverifiedListingRow[]) {
    if (!isUnverifiedGuestProjectExpired(row)) continue;
    const ok = await deleteUnverifiedListing(row.id);
    if (ok) deleted += 1;
  }

  return deleted;
}
