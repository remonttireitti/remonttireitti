import { NextResponse } from "next/server";
import { inferProtocolFromId, parseZwaveDeviceId } from "@/lib/device-protocol";
import { parseHubHomeDevices, prepareDevicesForList } from "@/lib/hub-lights";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import type { FloorPlanPin } from "@/lib/floor-plan-pins";
import { fetchPrimaryHub } from "@/lib/hubs";
import { delegateToYellowApi } from "@/lib/local-api-route";
import type { HubState } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const local = await delegateToYellowApi(new Request("http://local"), "/api/floor-plan");
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

  const state = (hub.state as HubState) ?? {};
  const pins = Array.isArray(state.floor_plan_pins) ? state.floor_plan_pins : [];

  const homeDevices = normalizeHomeDevices(state.home_devices, {
    integrations: state.integrations,
    airthingsState: state,
  });

  const devices = prepareDevicesForList(
    parseHubHomeDevices(homeDevices, state.lights, state.device_overrides),
    homeDevices,
    state.zwave_nodes,
    state.device_overrides,
  ).map((d) => ({
    id: d.id,
    name: d.name,
    on: d.on,
    protocol: inferProtocolFromId(d.id, d.protocol),
    kind: d.kind,
    controllable: d.controllable,
    readingLabel: d.readingLabel,
    temperature_c: d.temperature_c,
    humidity_pct: d.humidity_pct,
    co2_ppm: d.co2_ppm,
    sensor_state: d.sensor_state,
    role: d.role,
    roomAnchorId: d.roomAnchorId,
    room: d.room,
    node_id: parseZwaveDeviceId(d.id)?.nodeId ?? null,
  }));

  return NextResponse.json({ pins: pins as FloorPlanPin[], devices });
}
