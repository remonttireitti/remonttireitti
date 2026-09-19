import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Redirect to browser PDF download — @react-pdf renderToBuffer exceeds
 * Cloudflare Worker CPU/memory limits (Error 1102).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  return NextResponse.redirect(
    new URL(`/sopimus-pdf/${projectId}`, _request.url),
    307,
  );
}
