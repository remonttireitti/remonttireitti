import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { ListingCardGrid } from "@/components/marketplace/listing-card-grid";
import { ListingCategoryFilter } from "@/components/marketplace/listing-category-filter";
import { fetchPublishedListings } from "@/lib/marketplace-listings-server";
import {
  getListingCategory,
  listingCategoryFromUrlParam,
} from "@/lib/marketplace-categories";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `Ilmoitukset — ${marketplaceBrand.nameShort}`,
  description:
    "Selaa julkaistuja lämpöpumppu- ja laiteilmoituksia. Käytettyjä ja uusia laitteita ympäri Suomen.",
  path: "/markkinapaikka/ilmoitukset",
});

export default async function MarketplaceListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>;
}) {
  const { kategoria } = await searchParams;
  const categoryFilter = listingCategoryFromUrlParam(kategoria);
  const listings = await fetchPublishedListings(50, categoryFilter);
  const categoryMeta = categoryFilter ? getListingCategory(categoryFilter) : null;

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
        <div className={`mt-4 ${brand.pageHeaderRow}`}>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">
              {categoryMeta ? categoryMeta.label : "Ilmoitukset"}
            </h1>
            <p className="mt-1 text-stone-600">
              {categoryMeta
                ? categoryMeta.description
                : "Laitteet, varaosat, tarvikkeet ja työkalut — ei kirjautumista"}
            </p>
          </div>
          <Link
            href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
            className={`shrink-0 ${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
          >
            Lisää ilmoitus
          </Link>
        </div>

        <div className="mt-8">
          <ListingCategoryFilter active={categoryFilter} />
        </div>

        <div className="mt-6">
          <ListingCardGrid listings={listings} />
        </div>
      </main>
    </div>
  );
}
