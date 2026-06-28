import { NextResponse } from "next/server";
import { resolveWifiChannelDisplayName } from "@/lib/device-item-overrides";
import { buildEmMeterLive } from "@/lib/energy-meter-live";
import { meterLivePowerKw } from "@/lib/energy-live";
import { findEmMeters, findPrimaryEmMeter } from "@/lib/energy-samples";
import { isHubOnline } from "@/lib/device-status";
import { fetchPrimaryHub } from "@/lib/hubs";
import { delegateToYellowApi } from "@/lib/local-api-route";
import type { HubState } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Nopea reaaliaikainen teho — vain hub-tila, ei historianäytteitä. */
export async function GET() {
  const local = await delegateToYellowApi(new Request("http://local"), "/api/energy/live");
  if (local) return local;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) {
    return NextResponse.json({ error: "no_hub" }, { status: 404 });
  }

  const overrides = (hub.state as HubState)?.device_overrides;
  const meters = findEmMeters(hub.state.home_devices);
  const primaryMeterId = findPrimaryEmMeter(meters);

  const metersForClient = meters.map(({ id, device }) => {
    const live = buildEmMeterLive(device);
    return {
      id,
      name: resolveWifiChannelDisplayName(id, device.name, overrides),
      host: device.host,
      model: device.model,
      live,
      is_primary: id === primaryMeterId,
      counts_in_total: id === primaryMeterId,
    };
  });

  const primary = primaryMeterId
    ? metersForClient.find((m) => m.id === primaryMeterId)
    : undefined;

  return NextResponse.json({
    hubOnline: isHubOnline(hub.last_seen_at),
    primary_meter_id: primaryMeterId,
    summary: {
      power_kw_total: primary ? meterLivePowerKw(primary.live) : null,
    },
    meters: metersForClient,
  });
}
