import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser, isContractor } from "@/lib/auth";
import { marketplaceCreateListingPath } from "@/lib/marketplace-listing-links";
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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>;
}): Promise<Metadata> {
  const { kategoria } = await searchParams;
  const categoryFilter = listingCategoryFromUrlParam(kategoria);
  const categoryMeta = categoryFilter
    ? getListingCategory(categoryFilter)
    : null;

  if (categoryMeta) {
    return pageMetadata({
      title: `${categoryMeta.label} — ${marketplaceBrand.nameShort}`,
      description: `${categoryMeta.description}. Selaa ${categoryMeta.label.toLowerCase()}-ilmoituksia markkinapaikalla.`,
      path: `/markkinapaikka/ilmoitukset?kategoria=${categoryMeta.urlSlug}`,
    });
  }

  return pageMetadata({
    title: `Ilmoitukset — ${marketplaceBrand.nameShort}`,
    description:
      "Selaa julkaistuja lämpöpumppu- ja laiteilmoituksia. Käytettyjä ja uusia laitteita ympäri Suomen.",
    path: "/markkinapaikka/ilmoitukset",
  });
}

export default async function MarketplaceListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>;
}) {
  const { kategoria } = await searchParams;
  const categoryFilter = listingCategoryFromUrlParam(kategoria);
  const listings = await fetchPublishedListings(50, categoryFilter);
  const categoryMeta = categoryFilter ? getListingCategory(categoryFilter) : null;

  const user = await getSessionUser();
  const createListingHref = marketplaceCreateListingPath(
    user ? await isContractor() : false,
  );

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
            href={createListingHref}
            className={`shrink-0 ${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
          >
            Lisää ilmoitus
          </Link>
        </div>

        <div className="mt-8">
          <ListingCategoryFilter active={categoryFilter} />
        </div>

        <div className="mt-6">
          <ListingCardGrid listings={listings} variant="list" />
        </div>
      </main>
    </div>
  );
}
