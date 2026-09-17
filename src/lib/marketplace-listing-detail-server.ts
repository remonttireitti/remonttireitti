import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { ListingProductCategory } from "@/lib/marketplace-categories";
import { resolveListingSellerAccess } from "@/lib/listing-guest-access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const LISTING_DETAIL_SELECT = `
  id, title, description, price_eur, municipality, postal_code,
  condition, manufacturer, model, year_manufactured, pump_type_slug, product_category,
  listing_kind,
  donation_recipient_id,
  seller_type, seller_id, status, pending_publish, published_at, expires_at,
  contact_email, contact_phone, address_line
`.trim();

/** Varmempi valinta jos uudempi sarake puuttuu tuotannosta. */
const LISTING_DETAIL_SELECT_CORE = `
  id, title, description, price_eur, municipality, postal_code,
  condition, manufacturer, model, year_manufactured, pump_type_slug, product_category,
  listing_kind,
  seller_type, seller_id, status, published_at, expires_at,
  contact_email, contact_phone, address_line
`.trim();

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

function isMissingColumnError(error: PostgrestError | null): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    /column .* does not exist/i.test(error.message ?? "")
  );
}

function normalizeListingRow(raw: Record<string, unknown>): ListingDetailRow {
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    price_eur: (raw.price_eur as number | null) ?? null,
    municipality: String(raw.municipality ?? ""),
    postal_code: String(raw.postal_code ?? ""),
    condition: (raw.condition as "used" | "new") ?? "used",
    manufacturer: (raw.manufacturer as string | null) ?? null,
    model: (raw.model as string | null) ?? null,
    year_manufactured: (raw.year_manufactured as number | null) ?? null,
    pump_type_slug: (raw.pump_type_slug as string | null) ?? null,
    product_category: (raw.product_category as ListingProductCategory | null) ?? null,
    listing_kind: (raw.listing_kind as string | null) ?? "sell",
    donation_recipient_id: (raw.donation_recipient_id as string | null) ?? null,
    seller_type: (raw.seller_type as "customer" | "contractor") ?? "customer",
    seller_id: (raw.seller_id as string | null) ?? null,
    status: String(raw.status ?? "draft"),
    pending_publish: Boolean(raw.pending_publish),
    published_at: (raw.published_at as string | null) ?? null,
    expires_at: (raw.expires_at as string | null) ?? null,
    contact_email: String(raw.contact_email ?? ""),
    contact_phone: String(raw.contact_phone ?? ""),
    address_line: (raw.address_line as string | null) ?? null,
  };
}

async function queryListingRow(
  client: SupabaseClient,
  id: string,
  select: string,
): Promise<{ row: ListingDetailRow | null; error: PostgrestError | null }> {
  const { data, error } = await client
    .from("equipment_listings")
    .select(select)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { row: null, error };
  }

  if (!data) return { row: null, error: null };
  return {
    row: normalizeListingRow(data as unknown as Record<string, unknown>),
    error: null,
  };
}

async function fetchListingWithSelectFallback(
  client: SupabaseClient,
  id: string,
): Promise<ListingDetailRow | null> {
  const selects = [LISTING_DETAIL_SELECT, LISTING_DETAIL_SELECT_CORE];

  for (const select of selects) {
    const { row, error } = await queryListingRow(client, id, select);
    if (row) return row;
    if (error && !isMissingColumnError(error)) {
      console.error("[fetchListingForDetailPage]", error.message);
      return null;
    }
  }

  return null;
}

/**
 * Hakee ilmoituksen detail-sivulle. Julkaistut näkyvät RLS:n kautta;
 * myyjän luonnos/vierailijan hallintalinkki haetaan admin-clientilla.
 */
export async function fetchListingForDetailPage(
  id: string,
): Promise<ListingDetailRow | null> {
  const supabase = await createClient();
  const publicRow = await fetchListingWithSelectFallback(supabase, id);
  if (publicRow) return publicRow;

  const sellerAccess = await resolveListingSellerAccess(id);
  const admin = tryCreateAdminClient();
  if (!admin) return null;

  if (sellerAccess) {
    const sellerRow = await fetchListingWithSelectFallback(admin, id);
    if (sellerRow) return sellerRow;
  }

  // Julkaistu ilmoitus: varmistus admin-haulla jos RLS- tai sarakeongelma esti lukemisen.
  for (const select of [LISTING_DETAIL_SELECT, LISTING_DETAIL_SELECT_CORE]) {
    const { data, error } = await admin
      .from("equipment_listings")
      .select(select)
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      if (!isMissingColumnError(error)) {
        console.error("[fetchListingForDetailPage:published]", error.message);
        return null;
      }
      continue;
    }

    if (data) {
      return normalizeListingRow(data as unknown as Record<string, unknown>);
    }
  }

  return null;
}
