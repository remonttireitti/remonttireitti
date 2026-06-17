import { NextResponse } from "next/server";
import { getDeviceStatus } from "@/lib/device-status-server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const status = await getDeviceStatus(supabase, user.id);
  if (!status) {
    return NextResponse.json({ error: "no_hub" }, { status: 404 });
  }

  return NextResponse.json(status);
}
