import type { ListingCardItem } from "@/components/marketplace/listing-card-grid";
import { expireListingsIfNeeded } from "@/lib/expire-listings";
import { fetchListingCoverUrls } from "@/lib/listing-photos";
import type { ListingProductCategory } from "@/lib/marketplace-categories";
import { createClient } from "@/lib/supabase/server";

export async function fetchPublishedListings(
  limit = 6,
  category?: ListingProductCategory | null,
  listingKind?: "sell" | "wanted" | null,
): Promise<ListingCardItem[]> {
  await expireListingsIfNeeded();
  const supabase = await createClient();
  let query = supabase
    .from("equipment_listings")
    .select(
      "id, title, price_eur, municipality, postal_code, condition, seller_type, product_category, highlighted_in_search, listing_kind",
    )
    .eq("status", "published")
    .order("highlighted_in_search", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq("product_category", category);
  }
  if (listingKind) {
    query = query.eq("listing_kind", listingKind);
  }

  const { data } = await query;
  const listings = (data ?? []) as ListingCardItem[];
  const covers = await fetchListingCoverUrls(listings.map((l) => l.id));

  return listings.map((l) => ({
    ...l,
    thumbnail_url: covers.get(l.id) ?? null,
  }));
}

/** @deprecated Käytä fetchSitemapListings — tämä delegoi sitemap-moduuliin. */
export async function fetchPublishedListingsForSitemap(): Promise<
  { id: string; updated_at: string }[]
> {
  const { fetchSitemapListings } = await import("@/lib/sitemap-data");
  return fetchSitemapListings();
}
