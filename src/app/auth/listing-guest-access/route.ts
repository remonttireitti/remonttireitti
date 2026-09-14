import { NextResponse } from "next/server";
import {
  appendListingAccessCookie,
  fetchGuestListingByToken,
} from "@/lib/listing-guest-access";
import { siteUrl } from "@/lib/email";

/** Asettaa vierailmoituksen hallintaevästeen sähköpostilinkistä. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const listingId = url.searchParams.get("listing");
  const token = url.searchParams.get("token");

  if (!listingId || !token) {
    return NextResponse.redirect(siteUrl("/markkinapaikka/ilmoita?virhe=linkki"));
  }

  const listing = await fetchGuestListingByToken(listingId, token);
  if (!listing) {
    return NextResponse.redirect(
      siteUrl(`/markkinapaikka/ilmoitukset/${listingId}?virhe=linkki`),
    );
  }

  const response = NextResponse.redirect(
    siteUrl(`/markkinapaikka/ilmoitukset/${listingId}`),
  );
  return appendListingAccessCookie(response, listingId, token);
}
