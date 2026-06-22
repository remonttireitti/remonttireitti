import { NextResponse } from "next/server";
import { runElectricityPriceAutomations } from "@/lib/electricity-automation-runner";
import { normalizeHub } from "@/lib/hubs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const { data: rows, error } = await admin.from("hubs").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ hub_id: string; fired: string[]; skipped: string[] }> = [];
  for (const row of rows ?? []) {
    const hub = normalizeHub(row as Record<string, unknown>);
    const result = await runElectricityPriceAutomations(admin, hub);
    results.push({ hub_id: hub.id, ...result });
  }

  return NextResponse.json({ ok: true, results });
}
