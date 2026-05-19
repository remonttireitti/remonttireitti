import type { ListingCardItem } from "@/components/marketplace/listing-card-grid";
import { expireListingsIfNeeded } from "@/lib/expire-listings";
import { createClient } from "@/lib/supabase/server";

export async function fetchPublishedListings(
  limit = 6,
): Promise<ListingCardItem[]> {
  await expireListingsIfNeeded();
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment_listings")
    .select(
      "id, title, price_eur, municipality, postal_code, condition, seller_type",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as ListingCardItem[];
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
