import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login"]);

function isLocalMode(): boolean {
  return process.env.ALYKOTI_LOCAL_MODE === "1" || process.env.ALYKOTI_LOCAL_MODE === "true";
}

function hasAuthSession(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) => cookie.name.includes("auth-token") && cookie.value.length > 0,
  );
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isLocalMode()) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    if (hasAuthSession(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.delete("redirect");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!hasAuthSession(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
