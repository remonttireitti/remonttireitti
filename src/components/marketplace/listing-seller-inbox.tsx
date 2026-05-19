import { ListingChat } from "@/components/messaging/listing-chat";
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
}: {
  listingId: string;
  inquiries: SellerInquiryRow[];
  currentUserId: string;
  sellerLabel: string;
}) {
  if (inquiries.length === 0) {
    return (
      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        <h2 className="font-semibold text-stone-900">Viestit ostajilta</h2>
        <p className="mt-2">Ei vielä yhteydenottoja tähän ilmoitukseen.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-6">
      <h2 className="text-lg font-semibold">Viestit ostajilta</h2>
      {inquiries.map((inq) => (
        <div key={inq.inquiryId} className="rounded-xl border border-stone-200 p-1">
          <p className="px-4 pt-3 text-xs font-medium text-stone-500">
            Ostaja: {inq.buyerLabel}
          </p>
          <ListingChat
            listingId={listingId}
            inquiryId={inq.inquiryId}
            messages={inq.messages}
            currentUserId={currentUserId}
            buyerId={inq.buyerId}
            sellerLabel={sellerLabel}
            buyerLabel={inq.buyerLabel}
            heading="Vastaa ostajalle"
            subtext="Ostaja saa sähköposti-ilmoituksen vastauksestasi."
          />
        </div>
      ))}
    </section>
  );
}
