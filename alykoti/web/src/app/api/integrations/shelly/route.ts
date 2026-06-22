import { NextResponse } from "next/server";
import { isHubOnline } from "@/lib/device-status";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { HubHomeDevice, ShellyDeviceConfig } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChannelLive = {
  id: string;
  name: string;
  kind: string;
  on?: boolean;
  controllable?: boolean;
  power_w?: number | null;
  energy_wh?: number | null;
  em_a_power_w?: number | null;
  em_b_power_w?: number | null;
};

function channelsForHost(host: string, home: Record<string, HubHomeDevice> | undefined): ChannelLive[] {
  const prefix = `shelly:${host}:`;
  return Object.entries(home ?? {})
    .filter(([id]) => id.startsWith(prefix))
    .map(([id, d]) => ({
      id,
      name: d.name ?? id,
      kind: d.kind ?? "other",
      on: d.on,
      controllable: d.controllable,
      power_w: d.power_w,
      energy_wh: d.energy_wh,
      em_a_power_w: d.em_a_power_w,
      em_b_power_w: d.em_b_power_w,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fi"));
}

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
  const live = configured.map((dev: ShellyDeviceConfig) => {
    const channels = channelsForHost(dev.host, home);
    return {
      id: dev.id,
      name: dev.name,
      host: dev.host,
      model: dev.model,
      channels,
      reachable: channels.length > 0,
      configured: true,
      awaitingSync: channels.length === 0 && isHubOnline(hub.last_seen_at),
    };
  });

  const discovered = (hub.state.shelly_discovered ?? []).map((item) => ({
    ...item,
    type_label: formatCapabilityLabel(item),
  }));

  return NextResponse.json({
    configured: true,
    hubOnline: isHubOnline(hub.last_seen_at),
    devices: configured,
    live,
    discovered,
  });
}
