import { NextResponse } from "next/server";
import { fetchElectricityPrices } from "@/lib/electricity-prices";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const prices = await fetchElectricityPrices();
    return NextResponse.json(prices);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
