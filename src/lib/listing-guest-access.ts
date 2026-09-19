import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hashProjectAccessToken } from "@/lib/project-guest-access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const COOKIE_PREFIX = "rr_la_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

export type GuestListingRow = {
  id: string;
  seller_id: string | null;
  guest_seller_email: string | null;
  seller_type: string;
  status: string;
  title: string;
  contact_email: string;
};

export type GuestAccessibleListing = GuestListingRow & {
  municipality: string;
  price_eur: number | null;
  pending_publish: boolean;
  expires_at: string | null;
  published_at: string | null;
};

const GUEST_LISTING_SELECT =
  "id, seller_id, guest_seller_email, seller_type, status, title, contact_email, municipality, price_eur, pending_publish, expires_at, published_at";

export type ListingSellerAccess =
  | { kind: "user"; userId: string }
  | { kind: "guest"; listingId: string; guestEmail: string };

export function listingAccessCookieName(listingId: string): string {
  return `${COOKIE_PREFIX}${listingId}`;
}

export function listingAccessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function appendListingAccessCookie(
  response: NextResponse,
  listingId: string,
  rawToken: string,
): NextResponse {
  response.cookies.set(
    listingAccessCookieName(listingId),
    rawToken,
    listingAccessCookieOptions(),
  );
  return response;
}

export async function setListingAccessCookie(
  listingId: string,
  rawToken: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(
    listingAccessCookieName(listingId),
    rawToken,
    listingAccessCookieOptions(),
  );
}

export async function readListingAccessToken(
  listingId: string,
): Promise<string | null> {
  const jar = await cookies();
  return jar.get(listingAccessCookieName(listingId))?.value ?? null;
}

export async function fetchGuestListingByToken(
  listingId: string,
  rawToken: string,
): Promise<GuestListingRow | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;

  const hash = hashProjectAccessToken(rawToken);
  const { data, error } = await admin
    .from("equipment_listings")
    .select(GUEST_LISTING_SELECT)
    .eq("id", listingId)
    .eq("access_token_hash", hash)
    .not("guest_seller_email", "is", null)
    .maybeSingle();

  if (error) {
    console.error("[fetchGuestListingByToken]", error.code, error.message);
    return null;
  }

  return (data as GuestListingRow | null) ?? null;
}

export async function resolveListingSellerAccess(
  listingId: string,
): Promise<ListingSellerAccess | null> {
  const user = await getSessionUser();
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("equipment_listings")
      .select("seller_id")
      .eq("id", listingId)
      .maybeSingle();

    if (data?.seller_id === user.id) {
      return { kind: "user", userId: user.id };
    }
  }

  const token = await readListingAccessToken(listingId);
  if (token) {
    const listing = await fetchGuestListingByToken(listingId, token);
    if (listing?.guest_seller_email) {
      return {
        kind: "guest",
        listingId,
        guestEmail: listing.guest_seller_email,
      };
    }
  }

  return null;
}

/** Ilmoitukset joihin tässä selaimessa on voimassa oleva hallintalinkki-cookie. */
export async function listGuestAccessibleListingsFromCookies(): Promise<
  GuestAccessibleListing[]
> {
  const jar = await cookies();
  const listings: GuestAccessibleListing[] = [];
  const seen = new Set<string>();

  for (const cookie of jar.getAll()) {
    if (!cookie.name.startsWith(COOKIE_PREFIX)) continue;
    const listingId = cookie.name.slice(COOKIE_PREFIX.length);
    if (!listingId || seen.has(listingId)) continue;
    seen.add(listingId);

    const listing = await fetchGuestListingByToken(listingId, cookie.value);
    if (listing) listings.push(listing as GuestAccessibleListing);
  }

  return listings.sort((a, b) => {
    const aTime = a.published_at ?? "";
    const bTime = b.published_at ?? "";
    return bTime.localeCompare(aTime);
  });
}
