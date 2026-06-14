import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser, isContractor } from "@/lib/auth";
import { marketplaceCreateListingPath } from "@/lib/marketplace-listing-links";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { ListingCardGrid } from "@/components/marketplace/listing-card-grid";
import { ListingCategoryFilter } from "@/components/marketplace/listing-category-filter";
import {
  ListingKindFilter,
  listingKindFromUrlParam,
} from "@/components/marketplace/listing-kind-filter";
import { fetchPublishedListings } from "@/lib/marketplace-listings-server";
import {
  getListingCategory,
  listingCategoryFromUrlParam,
} from "@/lib/marketplace-categories";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

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

  const listingsSeo = seoDefByPath("/markkinapaikka/ilmoitukset")!;
  return pageMetadata({
    title: listingsSeo.title,
    description: listingsSeo.description,
    path: "/markkinapaikka/ilmoitukset",
    keywords: listingsSeo.keywords,
  });
}

export default async function MarketplaceListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string; tyyppi?: string }>;
}) {
  const { kategoria, tyyppi } = await searchParams;
  const categoryFilter = listingCategoryFromUrlParam(kategoria);
  const kindFilter = listingKindFromUrlParam(tyyppi);
  const listings = await fetchPublishedListings(50, categoryFilter, kindFilter);
  const categoryMeta = categoryFilter ? getListingCategory(categoryFilter) : null;

  const user = await getSessionUser();
  const createListingHref = marketplaceCreateListingPath(
    user ? await isContractor() : false,
  );

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
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
                : "Laitteet, varaosat, tarvikkeet ja työkalut remonttiin — ei kirjautumista"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Link
              href={createListingHref}
              className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
            >
              Myy laite
            </Link>
            <Link
              href="/markkinapaikka/ilmoita?tyyppi=ostopyynto"
              className={`${brand.btnSecondary} ${brand.btnSecondaryBlock} text-center text-sm`}
            >
              Haluan ostaa
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <ListingCategoryFilter active={categoryFilter} />
          <ListingKindFilter
            active={kindFilter}
            categoryQuery={
              categoryFilter
                ? getListingCategory(categoryFilter)?.urlSlug
                : undefined
            }
          />
        </div>

        <div className="mt-6">
          <ListingCardGrid listings={listings} variant="list" />
        </div>
      </main>
    </div>
  );
}
