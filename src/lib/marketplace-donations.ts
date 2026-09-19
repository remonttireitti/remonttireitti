/** Lahjoitusilmoitusten kiintiöt ja copy. */

export const DONATION_MAX_ACTIVE_LISTINGS = 2;

export function donationListingTitle(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "Olet lahjoittanut kerran ilmaiseksi";
  return `Olet lahjoittanut ${count} kertaa ilmaiseksi`;
}

export type DonationCompletionStatus =
  | "selected"
  | "pending_recipient"
  | "confirmed"
  | "rejected";

export type ListingDonationCompletion = {
  id: string;
  listing_id: string;
  seller_id: string;
  recipient_id: string;
  seller_handed_over_at: string | null;
  recipient_confirmed_at: string | null;
  recipient_rejected: boolean;
  status: DonationCompletionStatus;
};
