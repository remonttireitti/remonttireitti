import { NextResponse } from "next/server";
import { inferProtocolFromId, parseZwaveDeviceId } from "@/lib/device-protocol";
import { parseHubHomeDevices, prepareDevicesForList } from "@/lib/hub-lights";
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

  const devices = prepareDevicesForList(
    parseHubHomeDevices(homeDevices, hub.state.lights, hub.state.device_overrides),
    homeDevices,
    hub.state.zwave_nodes,
    hub.state.device_overrides,
  ).map((d) => ({
    id: d.id,
    name: d.name,
    on: d.on,
    protocol: inferProtocolFromId(d.id, d.protocol),
    kind: d.kind,
    room: d.room,
    controllable: d.controllable,
    capabilities: d.capabilities,
    capabilitiesLabel: d.capabilitiesLabel,
    readingLabel: d.readingLabel,
    readings: d.readings,
    locked: d.locked,
    role: d.role,
    inferredRole: d.inferredRole,
    roleOverride: d.roleOverride,
    roomAnchorId: d.roomAnchorId,
    node_id: (() => {
      const parsed = parseZwaveDeviceId(d.id);
      return parsed?.nodeId;
    })(),
    endpoint: d.endpoint ?? parseZwaveDeviceId(d.id)?.endpoint,
  }));

  return NextResponse.json({
    configured: true,
    hubOnline: isHubOnline(hub.last_seen_at),
    devices,
  });
}
