import { NextResponse } from "next/server";
import { publishGuestProjectAfterVerification } from "@/app/actions/guest-projects";
import {
  fetchGuestProjectByToken,
  setProjectAccessCookie,
} from "@/lib/project-guest-access";
import { siteUrl } from "@/lib/email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("project");
  const token = url.searchParams.get("token");

  if (!projectId || !token) {
    return NextResponse.redirect(siteUrl("/remontti/uusi?virhe=vahvistus"));
  }

  const project = await fetchGuestProjectByToken(projectId, token);
  if (!project) {
    return NextResponse.redirect(siteUrl("/remontti/uusi?virhe=linkki"));
  }

  const result = await publishGuestProjectAfterVerification(projectId, token);
  if (result.error) {
    return NextResponse.redirect(
      siteUrl(`/remontti/${projectId}?virhe=${encodeURIComponent(result.error)}`),
    );
  }

  await setProjectAccessCookie(projectId, token);

  const redirectParam = result.published ? "julkaistu=1" : "vahvistettu=1";
  return NextResponse.redirect(siteUrl(`/remontti/${projectId}?${redirectParam}`));
}
