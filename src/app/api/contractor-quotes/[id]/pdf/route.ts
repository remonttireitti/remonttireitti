import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Uudelleenohjaus selain-PDF:ään — palvelin-PDF ei toimi Cloudflare Workers -rajojen vuoksi. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: quoteId } = await context.params;
  return NextResponse.redirect(
    new URL(`/tarjouslaskuri/lataus/${quoteId}`, _request.url),
    307,
  );
}
