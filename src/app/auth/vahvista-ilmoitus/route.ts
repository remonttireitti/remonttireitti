import { NextResponse } from "next/server";
import { publishConsumerListingAfterVerification } from "@/app/actions/listing-verification";
import { fetchPendingListingByToken } from "@/lib/listing-verification-access";
import { siteUrl } from "@/lib/email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const listingId = url.searchParams.get("listing");
  const token = url.searchParams.get("token");

  if (!listingId || !token) {
    return NextResponse.redirect(siteUrl("/markkinapaikka/ilmoita?virhe=vahvistus"));
  }

  const listing = await fetchPendingListingByToken(listingId, token);
  if (!listing) {
    return NextResponse.redirect(siteUrl("/markkinapaikka/ilmoita?virhe=linkki"));
  }

  const result = await publishConsumerListingAfterVerification(listingId, token);
  if (result.error) {
    return NextResponse.redirect(
      siteUrl(
        `/markkinapaikka/ilmoitukset/${listingId}?virhe=${encodeURIComponent(result.error)}`,
      ),
    );
  }

  return NextResponse.redirect(
    siteUrl(`/markkinapaikka/ilmoitukset/${listingId}?julkaistu=1`),
  );
}
