import { NextResponse } from "next/server";
import { isHubOnline } from "@/lib/device-status";
import { buildWifiHostLive } from "@/lib/wifi-integration-live";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { HubState, ShellyDeviceConfig } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatCapabilityLabel(item: {
  model?: string;
  switch_channels?: number;
  capabilities?: string[];
}): string {
  const caps = item.capabilities ?? [];
  if (caps.includes("em") && caps.includes("switch")) {
    return `${item.switch_channels ?? "?"} kanavaa + energia`;
  }
  if (caps.includes("em")) return "Energiamittari";
  if (item.switch_channels && item.switch_channels > 1) return `${item.switch_channels} kanavaa`;
  if (caps.includes("switch")) return "Kytkin";
  return item.model ?? "Shelly";
}

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

  const configured = hub.state.integrations?.shelly?.devices ?? [];
  const home = hub.state.home_devices ?? {};
  const overrides = hub.state.device_overrides;
  const hubOnline = isHubOnline(hub.last_seen_at);
  const live = configured.map((dev: ShellyDeviceConfig) =>
    buildWifiHostLive("shelly", dev, home, overrides, {
      configured: true,
      awaitingSync: channelsEmpty(dev, home, overrides) && hubOnline,
    }),
  );

  const discovered = (hub.state.shelly_discovered ?? []).map((item) => ({
    ...item,
    type_label: formatCapabilityLabel(item),
  }));

  return NextResponse.json({
    configured: true,
    hubOnline,
    devices: configured,
    live,
    discovered,
  });
}

function channelsEmpty(
  dev: ShellyDeviceConfig,
  home: HubState["home_devices"],
  overrides: HubState["device_overrides"],
): boolean {
  return buildWifiHostLive("shelly", dev, home, overrides).channels.length === 0;
}
