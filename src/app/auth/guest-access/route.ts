import { NextResponse } from "next/server";
import {
  appendProjectAccessCookie,
  fetchGuestProjectByToken,
} from "@/lib/project-guest-access";
import { siteUrl } from "@/lib/email";

/** Asettaa vieraslinkin evästeen Route Handlerissa (ei Server Componentissa). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("project");
  const token = url.searchParams.get("token");
  const to = url.searchParams.get("to") ?? "project";

  if (!projectId || !token) {
    return NextResponse.redirect(siteUrl("/kirjaudu"));
  }

  const project = await fetchGuestProjectByToken(projectId, token);
  if (!project) {
    const errorPath =
      to === "taydenna"
        ? `/remontti/${projectId}/taydenna?virhe=linkki&token=${encodeURIComponent(token)}`
        : `/remontti/uusi?virhe=linkki`;
    return NextResponse.redirect(siteUrl(errorPath));
  }

  const qs = new URLSearchParams();
  for (const key of ["julkaistu", "vahvistettu"] as const) {
    const value = url.searchParams.get(key);
    if (value) qs.set(key, value);
  }
  const suffix = qs.toString() ? `?${qs}` : "";

  const destParams = new URLSearchParams(suffix ? suffix.slice(1) : undefined);
  // Token URL-param varmuudeksi: eväste ei aina välity heti uudelleenohjauksen jälkeen
  // (Safari / Cloudflare). from=auth estää uuden kierroksen guest-accessiin.
  destParams.set("from", "auth");
  destParams.set("token", token);

  const dest =
    to === "taydenna"
      ? `/remontti/${projectId}/taydenna?${destParams}`
      : `/remontti/${projectId}?${destParams}`;

  const response = NextResponse.redirect(siteUrl(dest));
  return appendProjectAccessCookie(response, projectId, token);
}
