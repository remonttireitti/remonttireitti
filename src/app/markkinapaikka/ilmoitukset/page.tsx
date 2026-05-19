import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ListingCardGrid } from "@/components/marketplace/listing-card-grid";
import { fetchPublishedListings } from "@/lib/marketplace-listings-server";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `Ilmoitukset — ${marketplaceBrand.nameShort}`,
  description:
    "Selaa julkaistuja lämpöpumppu- ja laiteilmoituksia. Käytettyjä ja uusia laitteita ympäri Suomen.",
  path: "/markkinapaikka/ilmoitukset",
});

export default async function MarketplaceListingsPage() {
  const listings = await fetchPublishedListings(50);

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Ilmoitukset</h1>
            <p className="mt-1 text-stone-600">
              Julkaistut käytetyt ja uudet laitteet — ei kirjautumista
            </p>
          </div>
          <Link
            href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Lisää ilmoitus
          </Link>
        </div>

        <div className="mt-8">
          <ListingCardGrid listings={listings} />
        </div>
      </main>
    </div>
  );
}
