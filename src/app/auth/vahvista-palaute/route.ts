import { NextResponse } from "next/server";
import { verifyPlatformFeedback } from "@/app/actions/platform-feedback";
import { siteUrl } from "@/lib/email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const feedbackId = url.searchParams.get("feedback");
  const token = url.searchParams.get("token");

  if (!feedbackId || !token) {
    return NextResponse.redirect(siteUrl("/palaute?virhe=vahvistus"));
  }

  const result = await verifyPlatformFeedback(feedbackId, token);
  if (result.error) {
    return NextResponse.redirect(
      siteUrl(`/palaute?virhe=${encodeURIComponent(result.error)}`),
    );
  }

  return NextResponse.redirect(siteUrl("/palaute?vahvistus=1"));
}
