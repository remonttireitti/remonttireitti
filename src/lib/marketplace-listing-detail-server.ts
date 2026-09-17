import type { ListingProductCategory } from "@/lib/marketplace-categories";
import { resolveListingSellerAccess } from "@/lib/listing-guest-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const LISTING_DETAIL_SELECT = `
  id, title, description, price_eur, municipality, postal_code,
  condition, manufacturer, model, year_manufactured, pump_type_slug, product_category,
  listing_kind,
  donation_recipient_id,
  seller_type, seller_id, status, pending_publish, published_at, expires_at,
  contact_email, contact_phone, address_line
`;

export type ListingDetailRow = {
  id: string;
  title: string;
  description: string;
  price_eur: number | null;
  municipality: string;
  postal_code: string;
  condition: "used" | "new";
  manufacturer: string | null;
  model: string | null;
  year_manufactured: number | null;
  pump_type_slug: string | null;
  product_category: ListingProductCategory | null;
  listing_kind: string | null;
  donation_recipient_id: string | null;
  seller_type: "customer" | "contractor";
  seller_id: string | null;
  status: string;
  pending_publish: boolean;
  published_at: string | null;
  expires_at: string | null;
  contact_email: string;
  contact_phone: string;
  address_line: string | null;
};

/**
 * Hakee ilmoituksen detail-sivulle. Julkaistut näkyvät RLS:n kautta;
 * myyjän luonnos/vierailijan hallintalinkki haetaan admin-clientilla.
 */
export async function fetchListingForDetailPage(
  id: string,
): Promise<ListingDetailRow | null> {
  const supabase = await createClient();
  const { data: publicRow } = await supabase
    .from("equipment_listings")
    .select(LISTING_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (publicRow) return publicRow as ListingDetailRow;

  const sellerAccess = await resolveListingSellerAccess(id);
  if (!sellerAccess) return null;

  const admin = createAdminClient();
  const { data: sellerRow } = await admin
    .from("equipment_listings")
    .select(LISTING_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  return (sellerRow as ListingDetailRow | null) ?? null;
}
