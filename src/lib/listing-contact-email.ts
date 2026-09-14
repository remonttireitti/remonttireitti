/** Normalisoi ilmoituksen yhteys-sähköposti vertailua varten. */
export function normalizeListingContactEmail(email: string): string {
  return email.trim().toLowerCase();
}
