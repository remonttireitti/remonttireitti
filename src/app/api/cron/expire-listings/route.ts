import { expireEquipmentListings } from "@/lib/expire-listings";
import { expireAllUnverifiedListings } from "@/lib/expire-unverified-listings";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [expired, unverifiedDeleted] = await Promise.all([
    expireEquipmentListings(),
    expireAllUnverifiedListings(),
  ]);

  return NextResponse.json({ ok: true, expired, unverifiedDeleted });
}
