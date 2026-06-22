import { NextResponse } from "next/server";
import { parseHubHomeDevices } from "@/lib/hub-lights";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import { fetchPrimaryHub } from "@/lib/hubs";
import { isHubOnline } from "@/lib/device-status";
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

  const homeDevices = normalizeHomeDevices(hub.state.home_devices, {
    integrations: hub.state.integrations,
    airthingsState: hub.state,
  });

  const devices = parseHubHomeDevices(
    homeDevices,
    hub.state.lights,
    hub.state.device_overrides,
  ).map((d) => ({
    id: d.id,
    name: d.name,
    on: d.on,
    protocol: d.protocol,
    kind: d.kind,
    room: d.room,
    controllable: d.controllable,
    capabilities: d.capabilities,
    capabilitiesLabel: d.capabilitiesLabel,
    readingLabel: d.readingLabel,
    locked: d.locked,
    node_id: d.id.startsWith("zwave:")
      ? Number.parseInt(d.id.slice("zwave:".length), 10)
      : undefined,
  }));

  return NextResponse.json({
    configured: true,
    hubOnline: isHubOnline(hub.last_seen_at),
    devices,
  });
}
