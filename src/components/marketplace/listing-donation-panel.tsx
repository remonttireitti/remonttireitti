import {
  confirmDonationReceived,
  markDonationHandedOver,
} from "@/app/actions/listing-donations";
import type { ListingDonationCompletion } from "@/lib/marketplace-donations";

export function ListingDonationSellerPanel({
  listingId,
  completion,
  recipientLabel,
}: {
  listingId: string;
  completion: ListingDonationCompletion | null;
  recipientLabel: string | null;
}) {
  if (!completion) return null;

  if (completion.status === "selected") {
    return (
      <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-6">
        <h2 className="font-semibold text-emerald-950">Valittu noutaja</h2>
        <p className="mt-1 text-emerald-900">{recipientLabel ?? "Noutaja"}</p>
        <p className="mt-2 text-sm text-emerald-800/90">
          Sovi nouto viestillä. Merkitse luovutetuksi, kun tavara on noudettu — saaja
          vahvistaa vielä noudon.
        </p>
        <form action={markDonationHandedOver} className="mt-4">
          <input type="hidden" name="listing_id" value={listingId} />
          <button
            type="submit"
            className="rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-900"
          >
            Merkitse: tavara luovutettu
          </button>
        </form>
      </section>
    );
  }

  if (completion.status === "pending_recipient") {
    return (
      <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-950">Odottaa noutajan vahvistusta</h2>
        <p className="mt-2 text-sm text-amber-900">
          Merkitsit tavaran luovutetuksi. Saaja vahvistaa vielä, että nouto onnistui.
        </p>
      </section>
    );
  }

  if (completion.status === "confirmed") {
    return (
      <p className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Lahjoitus on vahvistettu. Kiitos kun jaat ylijäämää yhteisölle!
      </p>
    );
  }

  return null;
}

export function ListingDonationRecipientPanel({
  completion,
}: {
  completion: ListingDonationCompletion;
}) {
  if (completion.status !== "pending_recipient") return null;

  return (
    <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="font-semibold text-amber-950">Vahvista lahjoituksen nouto</h2>
      <p className="mt-2 text-sm text-amber-900">
        Myyjä merkitsi tavaran luovutetuksi. Vahvista vain, jos sait tavaran — muuten
        lahjoitusta ei lasketa myyjän tilille.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <form action={confirmDonationReceived}>
          <input type="hidden" name="completion_id" value={completion.id} />
          <input type="hidden" name="confirmed" value="yes" />
          <button
            type="submit"
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Kyllä, sain tavaran
          </button>
        </form>
        <form action={confirmDonationReceived}>
          <input type="hidden" name="completion_id" value={completion.id} />
          <input type="hidden" name="confirmed" value="no" />
          <button
            type="submit"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800"
          >
            En saanut tavaraa
          </button>
        </form>
      </div>
    </section>
  );
}

export function ListingDonationSelectedNotice({
  recipientLabel,
}: {
  recipientLabel: string | null;
}) {
  return (
    <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-6">
      <h2 className="font-semibold text-emerald-950">Sinut valittiin noutajaksi</h2>
      <p className="mt-2 text-sm text-emerald-900">
        Myyjä valitsi sinut lahjoituksen saajaksi. Sovi nouto viestillä alla.
        {recipientLabel ? null : " Odota myyjän ilmoitusta, kun tavara on luovutettu."}
      </p>
    </section>
  );
}
