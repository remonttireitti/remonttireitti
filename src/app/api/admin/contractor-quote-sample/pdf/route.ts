import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Uudelleenohjaus admin-esikatseluun — PDF luodaan selaimessa. */
export async function GET(request: Request) {
  return NextResponse.redirect(
    new URL("/admin/tarjous-esikatselu", request.url),
    307,
  );
}
