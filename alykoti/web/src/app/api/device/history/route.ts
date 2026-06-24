import { NextResponse } from "next/server";
import { resolveIndoorAirState } from "@/lib/airthings";
import { fetchDeviceMetricHistory, isDeviceMetric } from "@/lib/device-metrics";
import { fetchMetricHistory, type MetricRange } from "@/lib/metric-samples";
import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";
import type { HubState } from "@/lib/types";

export const runtime = "nodejs";

function parseRange(raw: string | null): MetricRange {
  if (raw === "week" || raw === "month") return raw;
  return "day";
}

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
  const range = parseRange(url.searchParams.get("range"));

  if (!metric) {
    return NextResponse.json({ error: "metric_required" }, { status: 400 });
  }

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) {
    return NextResponse.json({ error: "no_hub" }, { status: 404 });
  }

  const hubState = hub.state as HubState;
  const liveState = await resolveIndoorAirState(hubState);

  const history = isDeviceMetric(metric)
    ? await fetchDeviceMetricHistory(
        hub.id,
        metric,
        range,
        hubState.home_devices,
        hubState.device_overrides,
      )
    : await fetchMetricHistory(hub.id, metric, range, liveState);
  if (!history) {
    return NextResponse.json({ error: "unknown_metric" }, { status: 400 });
  }

  return NextResponse.json(history);
}
