"use server";

import {
  CONSUMER_FREE_MAX_ACTIVE_LISTINGS,
  LISTING_DURATION_DAYS,
} from "@/lib/marketplace-pricing";
import { normalizeListingContactEmail } from "@/lib/listing-contact-email";
import {
  countActiveConsumerListings,
  countActiveConsumerListingsByEmail,
} from "@/app/actions/marketplace-listings";
import { fetchPendingListingByToken } from "@/lib/listing-verification-access";
import { hashProjectAccessToken } from "@/lib/project-guest-access";
import { isUnverifiedGuestProjectExpired } from "@/lib/guest-project-verification";
import { deleteUnverifiedListing } from "@/lib/expire-unverified-listings";
import { createAdminClient } from "@/lib/supabase/admin";

export async function publishConsumerListingAfterVerification(
  listingId: string,
  rawToken: string,
): Promise<{ error?: string; published?: boolean }> {
  const listing = await fetchPendingListingByToken(listingId, rawToken);
  if (!listing) {
    return {
      error:
        "Vahvistuslinkki on vanhentunut tai virheellinen. Luo ilmoitus uudelleen.",
    };
  }

  if (
    isUnverifiedGuestProjectExpired({
      email_verified_at: listing.contact_email_verified_at,
      created_at: listing.created_at,
    })
  ) {
    await deleteUnverifiedListing(listingId);
    return {
      error:
        "Vahvistuslinkki on vanhentunut (24 h). Luo ilmoitus uudelleen.",
    };
  }

  if (listing.status !== "draft" || !listing.pending_publish) {
    if (listing.contact_email_verified_at) {
      return { published: listing.status === "published" };
    }
    return { error: "Ilmoitus ei ole enää vahvistettavissa." };
  }

  const contactEmail = normalizeListingContactEmail(listing.contact_email);

  if (listing.seller_id) {
    const activeByUser = await countActiveConsumerListings(listing.seller_id);
    if (activeByUser >= CONSUMER_FREE_MAX_ACTIVE_LISTINGS) {
      return {
        error: `Tilillä on jo ${CONSUMER_FREE_MAX_ACTIVE_LISTINGS} aktiivista ilmoitusta.`,
      };
    }
  }

  const activeByEmail = await countActiveConsumerListingsByEmail(contactEmail);

  if (activeByEmail >= CONSUMER_FREE_MAX_ACTIVE_LISTINGS) {
    return {
      error: `Sähköpostiosoitteeseen ${contactEmail} liittyy jo ${CONSUMER_FREE_MAX_ACTIVE_LISTINGS} aktiivista ilmoitusta.`,
    };
  }

  const admin = createAdminClient();
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + LISTING_DURATION_DAYS.consumer);
  const accessHash = hashProjectAccessToken(rawToken);

  const { error } = await admin
    .from("equipment_listings")
    .update({
      status: "published",
      pending_publish: false,
      contact_email_verified_at: listing.contact_email_verified_at ?? now.toISOString(),
      verification_token_hash: null,
      access_token_hash: accessHash,
      published_at: now.toISOString(),
      expires_at: expires.toISOString(),
    })
    .eq("id", listingId)
    .eq("verification_token_hash", accessHash);

  if (error) {
    console.error("[publishConsumerListingAfterVerification]", error.message);
    return { error: "Vahvistus epäonnistui." };
  }

  return { published: true };
}
