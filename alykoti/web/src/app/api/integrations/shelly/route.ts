import { NextResponse } from "next/server";
import { isHubOnline } from "@/lib/device-status";
import { fetchPrimaryHub } from "@/lib/hubs";
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

  const configured = hub.state.integrations?.shelly?.devices ?? [];
  const home = hub.state.home_devices ?? {};
  const live = configured.map((dev) => {
    const d = home[dev.id];
    return {
      id: dev.id,
      name: dev.name,
      host: dev.host,
      role: dev.role ?? d?.role ?? "switch",
      on: d?.on === true,
      reachable: Boolean(d),
      power_w: d?.power_w ?? null,
      energy_wh: d?.energy_wh ?? null,
      em_a_power_w: d?.em_a_power_w ?? null,
      em_b_power_w: d?.em_b_power_w ?? null,
    };
  });

  return NextResponse.json({
    configured: true,
    hubOnline: isHubOnline(hub.last_seen_at),
    devices: configured,
    live,
    discovered: hub.state.shelly_discovered ?? [],
  });
}
