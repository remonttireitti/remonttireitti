export type BidRevisionFields = {
  confirmed_content_revision: number | null;
  status: string;
};

export function isBidStale(
  bid: BidRevisionFields,
  projectContentRevision: number,
): boolean {
  if (bid.status !== "submitted") return false;
  if (bid.confirmed_content_revision == null) return true;
  return bid.confirmed_content_revision < projectContentRevision;
}

export const STALE_BID_CUSTOMER_MESSAGE =
  "Tarjous on vanhentunut, koska muokkasit tarjouspyyntöä. Odota, että urakoitsija päivittää tarjouksensa.";

export const STALE_BID_CONTRACTOR_MESSAGE =
  "Asiakas on muuttanut tarjouspyyntöä. Päivitä ja tallenna tarjouksesi, jotta asiakas voi hyväksyä sen.";
