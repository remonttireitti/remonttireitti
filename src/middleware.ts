import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const SITE_HOST = "remonttireitti.fi";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const { pathname, search } = request.nextUrl;

  // Cloudflare redirect rule typo: www → https://remonttireitti.fi/:path*
  if (pathname === "/:path*" || pathname.startsWith("/:path")) {
    return NextResponse.redirect(new URL(`https://${SITE_HOST}/`), 301);
  }

  if (host === `www.${SITE_HOST}`) {
    return NextResponse.redirect(
      new URL(`${pathname}${search}`, `https://${SITE_HOST}`),
      301,
    );
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
