import { NextResponse } from "next/server";
import { isHubOnline } from "@/lib/device-status";
import { buildWifiHostLive } from "@/lib/wifi-integration-live";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { TasmotaDeviceConfig } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
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

  const configured = hub.state.integrations?.tasmota?.devices ?? [];
  const home = hub.state.home_devices ?? {};
  const overrides = hub.state.device_overrides;
  const live = configured.map((dev: TasmotaDeviceConfig) =>
    buildWifiHostLive("tasmota", dev, home, overrides),
  );

  const discovered = (hub.state.tasmota_discovered ?? []).map((item) => ({
    ...item,
    type_label:
      item.switch_channels && item.switch_channels > 1
        ? `${item.switch_channels} kanavaa`
        : "Kytkin",
  }));

  return NextResponse.json({
    configured: true,
    hubOnline: isHubOnline(hub.last_seen_at),
    devices: configured,
    live,
    discovered,
  });
}
