import { NextResponse } from "next/server";
import { isHubOnline } from "@/lib/device-status";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { HubHomeDevice, TasmotaDeviceConfig } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function channelsForHost(host: string, home: Record<string, HubHomeDevice> | undefined) {
  const prefix = `tasmota:${host}:`;
  return Object.entries(home ?? {})
    .filter(([id]) => id.startsWith(prefix))
    .map(([id, d]) => ({
      id,
      name: d.name ?? id,
      kind: d.kind ?? "switch",
      on: d.on === true,
      controllable: d.controllable === true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fi"));
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

  const configured = hub.state.integrations?.tasmota?.devices ?? [];
  const home = hub.state.home_devices ?? {};
  const live = configured.map((dev: TasmotaDeviceConfig) => ({
    id: dev.id,
    name: dev.name,
    host: dev.host,
    model: dev.model,
    channels: channelsForHost(dev.host, home),
    reachable: channelsForHost(dev.host, home).length > 0,
  }));

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
