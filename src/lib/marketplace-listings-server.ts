import type { ListingCardItem } from "@/components/marketplace/listing-card-grid";
import { expireListingsIfNeeded } from "@/lib/expire-listings";
import { fetchListingCoverUrls } from "@/lib/listing-photos";
import type { ListingProductCategory } from "@/lib/marketplace-categories";
import { createClient } from "@/lib/supabase/server";

export async function fetchPublishedListings(
  limit = 6,
  category?: ListingProductCategory | null,
): Promise<ListingCardItem[]> {
  await expireListingsIfNeeded();
  const supabase = await createClient();
  let query = supabase
    .from("equipment_listings")
    .select(
      "id, title, price_eur, municipality, postal_code, condition, seller_type, product_category",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq("product_category", category);
  }

  const { data } = await query;
  const listings = (data ?? []) as ListingCardItem[];
  const covers = await fetchListingCoverUrls(listings.map((l) => l.id));

  return listings.map((l) => ({
    ...l,
    thumbnail_url: covers.get(l.id) ?? null,
  }));
}

export async function fetchPublishedListingsForSitemap(): Promise<
  { id: string; updated_at: string }[]
> {
  await expireListingsIfNeeded();
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment_listings")
    .select("id, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (data ?? []) as { id: string; updated_at: string }[];
}
