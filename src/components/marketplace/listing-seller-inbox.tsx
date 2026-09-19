import { ListingChat } from "@/components/messaging/listing-chat";
import { selectDonationRecipient } from "@/app/actions/listing-donations";
import type { ListingChatMessage } from "@/lib/listing-messages-server";

export type SellerInquiryRow = {
  inquiryId: string;
  buyerId: string;
  buyerLabel: string;
  messages: ListingChatMessage[];
};

export function ListingSellerInbox({
  listingId,
  inquiries,
  currentUserId,
  sellerLabel,
  isDonation = false,
  donationRecipientId = null,
}: {
  listingId: string;
  inquiries: SellerInquiryRow[];
  currentUserId: string;
  sellerLabel: string;
  isDonation?: boolean;
  donationRecipientId?: string | null;
}) {
  const canSelectRecipient =
    isDonation && !donationRecipientId && inquiries.length > 0;

  if (inquiries.length === 0) {
    return (
      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        <h2 className="font-semibold text-stone-900">
          {isDonation ? "Viestit kiinnostuneilta" : "Viestit ostajilta"}
        </h2>
        <p className="mt-2">
          {isDonation
            ? "Ei vielä yhteydenottoja tähän lahjoitukseen."
            : "Ei vielä yhteydenottoja tähän ilmoitukseen."}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {isDonation ? "Viestit kiinnostuneilta" : "Viestit ostajilta"}
        </h2>
        {canSelectRecipient && (
          <p className="mt-1 text-sm text-stone-600">
            Valitse yksi noutaja, kun olet valmis luovuttamaan tavaran.
          </p>
        )}
      </div>
      {inquiries.map((inq) => (
        <div key={inq.inquiryId} className="rounded-xl border border-stone-200 p-1">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
            <p className="text-xs font-medium text-stone-500">
              {isDonation ? "Kiinnostunut" : "Ostaja"}: {inq.buyerLabel}
            </p>
            {canSelectRecipient && (
              <form action={selectDonationRecipient}>
                <input type="hidden" name="listing_id" value={listingId} />
                <input type="hidden" name="recipient_id" value={inq.buyerId} />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Valitse lahjoitettavaksi
                </button>
              </form>
            )}
            {isDonation && donationRecipientId === inq.buyerId && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                Valittu noutaja
              </span>
            )}
          </div>
          <ListingChat
            listingId={listingId}
            inquiryId={inq.inquiryId}
            messages={inq.messages}
            currentUserId={currentUserId}
            buyerId={inq.buyerId}
            sellerLabel={sellerLabel}
            buyerLabel={inq.buyerLabel}
            heading={isDonation ? "Vastaa kiinnostuneelle" : "Vastaa ostajalle"}
            subtext={
              isDonation
                ? "Kiinnostunut saa sähköposti-ilmoituksen vastauksestasi."
                : "Ostaja saa sähköposti-ilmoituksen vastauksestasi."
            }
          />
        </div>
      ))}
    </section>
  );
}
