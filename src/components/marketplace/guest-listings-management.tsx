import Link from "next/link";
import { RemoveListingButton } from "@/components/marketplace/remove-listing-button";
import {
  sellerListingStatusLabel,
  type EquipmentListingStatus,
} from "@/lib/marketplace-listings";
import type { GuestAccessibleListing } from "@/lib/listing-guest-access";
import { ShareLinkButton } from "@/components/ui/share-link-button";
import { getSiteUrl } from "@/lib/seo";
import { brand } from "@/lib/brand-theme";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fi-FI");
}

export function GuestListingsManagementIntro() {
  return (
    <aside className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 sm:p-6">
      <h2 className="font-semibold text-amber-950">Ilmoitukset ilman tiliä</h2>
      <p className="mt-2 text-sm leading-relaxed text-amber-900">
        Kun jätät ilmoituksen ilman rekisteröitymistä, hallitset sitä{" "}
        <span className="font-medium">sähköpostiin tulevalla linkillä</span>.
        Vahvistus- ja hallintalinkki tulevat samaan viestiin. Tallenna viesti,
        jotta löydät ilmoituksen myöhemmin.
      </p>
      <p className="mt-3 text-sm text-amber-900/90">
        Jos olet jo avannut linkin tässä selaimessa, ilmoituksesi näkyvät alla.
        Kirjautuneena näet kaikki ilmoituksesi samassa paikassa.
      </p>
      <Link
        href="/kirjaudu?redirect=/markkinapaikka/omat-ilmoitukset"
        className="mt-4 inline-block text-sm font-semibold text-sky-800 hover:underline"
      >
        Kirjaudu — kaikki ilmoitukset yhdessä näkymässä
      </Link>
    </aside>
  );
}

export function GuestAccessibleListingsList({
  listings,
}: {
  listings: GuestAccessibleListing[];
}) {
  if (listings.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
        Ei ilmoituksia tässä selaimessa juuri nyt. Avaa sähköpostiisi tullut
        vahvistus- tai hallintalinkki, niin ilmoitus ilmestyy tähän listaan.
      </p>
    );
  }

  return (
    <ul className="mt-8 space-y-3">
      {listings.map((l) => {
        const pendingVerification = l.status === "draft" && l.pending_publish;
        const canView =
          l.status === "published" ||
          l.status === "expired" ||
          l.status === "removed" ||
          pendingVerification;
        const canRemove =
          l.status === "published" ||
          l.status === "expired" ||
          pendingVerification;

        return (
          <li
            key={l.id}
            className="rounded-xl border border-stone-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-stone-900">{l.title}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {l.municipality}
                  {l.price_eur != null &&
                    ` · ${l.price_eur.toLocaleString("fi-FI")} €`}
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  <span className="font-medium text-stone-700">
                    {sellerListingStatusLabel({
                      status: l.status as EquipmentListingStatus,
                      pending_publish: l.pending_publish,
                    })}
                  </span>
                  {l.status === "published" && l.expires_at && (
                    <> · voimassa {formatDate(l.expires_at)} asti</>
                  )}
                  {l.published_at && (
                    <> · julkaistu {formatDate(l.published_at)}</>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {canView && (
                  <Link
                    href={`/markkinapaikka/ilmoitukset/${l.id}`}
                    className="text-sm font-medium text-sky-700 hover:underline"
                  >
                    Näytä / hallitse
                  </Link>
                )}
                {l.status === "published" && (
                  <ShareLinkButton
                    url={`${getSiteUrl()}/markkinapaikka/ilmoitukset/${l.id}`}
                    title={l.title}
                    text={`Torin ilmoitus: ${l.title}`}
                    label="Jaa linkki"
                    compact
                  />
                )}
                {canRemove && (
                  <RemoveListingButton
                    listingId={l.id}
                    title={l.title}
                    redirectTo="/markkinapaikka/omat-ilmoitukset"
                  />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function GuestListingsManagementCard({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/markkinapaikka/omat-ilmoitukset"
      className={`flex flex-col rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md ${className}`}
    >
      <h2 className="font-semibold text-amber-950">Omat ilmoitukset</h2>
      <p className="mt-2 flex-1 text-sm text-amber-900/90">
        Julkaisitko ilman tiliä? Hallitse ilmoitusta sähköpostilinkillä — tai
        katso tällä selaimella avaamasi ilmoitukset.
      </p>
      <span className="mt-4 text-sm font-medium text-amber-900">Hallintaan →</span>
    </Link>
  );
}
