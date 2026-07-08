import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const SITE_HOST = "remonttireitti.fi";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const { pathname } = request.nextUrl;

  // Cloudflare redirect rule typo: www → https://remonttireitti.fi/:path*
  if (pathname === "/:path*" || pathname.startsWith("/:path")) {
    return NextResponse.redirect("https://remonttireitti.fi/", 301);
  }

  if (host === `www.${SITE_HOST}`) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = SITE_HOST;
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
