import { NextResponse } from "next/server";
import { fetchMetricHistory } from "@/lib/metric-samples";
import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const metric = url.searchParams.get("metric");
  const hours = Math.min(168, Math.max(1, Number(url.searchParams.get("hours") ?? "24")));

  if (!metric) {
    return NextResponse.json({ error: "metric_required" }, { status: 400 });
  }

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) {
    return NextResponse.json({ error: "no_hub" }, { status: 404 });
  }

  const history = await fetchMetricHistory(hub.id, metric, hours);
  if (!history) {
    return NextResponse.json({ error: "unknown_metric" }, { status: 400 });
  }

  return NextResponse.json(history);
}
