import type { Metadata } from "next";
import Link from "next/link";
import { fetchSellerListings } from "@/app/actions/marketplace-listings";
import {
  GuestAccessibleListingsList,
  GuestListingsManagementIntro,
} from "@/components/marketplace/guest-listings-management";
import { RemoveListingButton } from "@/components/marketplace/remove-listing-button";
import { RenewListingForm } from "@/components/marketplace/renew-listing-form";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import {
  getActiveContractorSubscription,
  subscriptionSlotsLeft,
} from "@/lib/marketplace-subscription";
import { createClient } from "@/lib/supabase/server";
import { listGuestAccessibleListingsFromCookies } from "@/lib/listing-guest-access";
import { marketplaceCreateListingPath } from "@/lib/marketplace-listing-links";
import { sellerListingStatusLabel } from "@/lib/marketplace-listings";
import { LISTING_DURATION_WEEKS } from "@/lib/marketplace-pricing";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { pageMetadata, getSiteUrl } from "@/lib/seo";
import { ShareLinkButton } from "@/components/ui/share-link-button";
import { brand } from "@/lib/brand-theme";

export const metadata: Metadata = pageMetadata({
  title: `Omat ilmoitukset — ${marketplaceBrand.nameShort}`,
  description:
    "Hallitse torin ilmoituksiasi. Ilman tiliä käytät sähköpostilinkkiä — tällä sivulla näet selaimessa avaamasi ilmoitukset.",
  path: "/markkinapaikka/omat-ilmoitukset",
  noIndex: true,
});

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fi-FI");
}

export default async function MyListingsPage() {
  const user = await getSessionUser();

  if (!user) {
    const guestListings = await listGuestAccessibleListingsFromCookies();

    return (
      <div className={brand.page}>
        <SiteHeader />
        <main className={brand.mainStandard}>
          <Link
            href="/markkinapaikka"
            className="text-sm text-sky-700 hover:underline"
          >
            ← {marketplaceBrand.nameShort}
          </Link>

          <h1 className="mt-4 text-2xl font-bold">Omat ilmoitukset</h1>
          <p className="mt-2 text-sm text-stone-600">
            Ilman tiliä hallitset ilmoitusta sähköpostiin tulevalla linkillä.
            Tällä sivulla näkyvät ilmoitukset, jotka olet avannut tässä selaimessa.
          </p>

          <GuestListingsManagementIntro />

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
              className={`${brand.btnPrimary} text-sm`}
            >
              Uusi ilmoitus ilman tiliä
            </Link>
            <Link
              href="/markkinapaikka/ilmoitukset"
              className={`${brand.btnSecondary} text-sm`}
            >
              Selaa toria
            </Link>
          </div>

          <GuestAccessibleListingsList listings={guestListings} />
        </main>
      </div>
    );
  }

  const listings = await fetchSellerListings(user.id);
  const contractor = await isContractor();
  const newListingHref = marketplaceCreateListingPath(contractor);

  let subscriptionSlots = 0;
  let subscriptionPlanName: string | null = null;
  if (contractor) {
    const supabase = await createClient();
    const sub = await getActiveContractorSubscription(supabase, user.id);
    if (sub) {
      subscriptionSlots = subscriptionSlotsLeft(sub);
      subscriptionPlanName = sub.plan.name_fi;
    }
  }
  const sellerType = contractor ? "contractor" : "customer";

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainStandard}>
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>

        <h1 className="mt-4 text-2xl font-bold">Omat ilmoitukset</h1>
        <p className="mt-2 text-sm text-stone-600">
          Julkaistut ilmoitukset näkyvät torilla {LISTING_DURATION_WEEKS} viikkoa
          tai kunnes poistat ne. Enintään 2 aktiivista ilmoitusta per
          sähköpostiosoite.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={newListingHref}
            className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800"
          >
            Uusi ilmoitus
          </Link>
          <Link
            href="/markkinapaikka/ilmoitukset"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Selaa toria
          </Link>
        </div>

        {listings.length === 0 ? (
          <p className="mt-8 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
            Ei vielä ilmoituksia.{" "}
            <Link
              href={newListingHref}
              className="font-medium text-sky-700 hover:underline"
            >
              Lisää ensimmäinen
            </Link>
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {listings.map((l) => {
              const pendingVerification =
                l.status === "draft" && l.pending_publish;
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
                          {sellerListingStatusLabel(l)}
                        </span>
                        {l.status === "published" && l.expires_at && (
                          <> · voimassa {formatDate(l.expires_at)} asti</>
                        )}
                        {l.status === "expired" && l.expires_at && (
                          <> · vanhentui {formatDate(l.expires_at)}</>
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
                          Näytä
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
                      {l.status === "expired" && (
                        <RenewListingForm
                          listingId={l.id}
                          sellerType={sellerType}
                          subscriptionSlots={subscriptionSlots}
                          subscriptionPlanName={subscriptionPlanName}
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
        )}
      </main>
    </div>
  );
}
