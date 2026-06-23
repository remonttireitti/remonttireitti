import { NextResponse } from "next/server";
import { hubDeviceEventsToLive } from "@/lib/device-events";
import { inferProtocolFromId } from "@/lib/device-protocol";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import { parseHubHomeDevices, prepareDevicesForList } from "@/lib/hub-lights";
import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";
import { resolveZigbeeDeviceContext } from "@/lib/zigbee-device-resolve";
import { resolveZwaveDeviceContext } from "@/lib/zwave-device-resolve";
import type { HubState } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId: param } = await context.params;
  const url = new URL(request.url);
  const protocolParam = url.searchParams.get("protocol");
  const protocol =
    protocolParam === "zwave" || protocolParam === "zigbee"
      ? protocolParam
      : inferProtocolFromId(decodeURIComponent(param));

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

  const hubState = hub.state as HubState | undefined;
  const homeDevices = normalizeHomeDevices(hubState?.home_devices, {
    integrations: hubState?.integrations,
    airthingsState: hubState,
  });
  const devices = prepareDevicesForList(
    parseHubHomeDevices(homeDevices, hubState?.lights, hubState?.device_overrides, {
      includeHidden: true,
    }),
    homeDevices,
    hubState?.zwave_nodes,
    hubState?.device_overrides,
  );

  if (protocol === "zwave") {
    const ctx = resolveZwaveDeviceContext(param, devices, hubState);
    if (!ctx) {
      return NextResponse.json({ error: "device_not_found" }, { status: 404 });
    }
    return NextResponse.json({
      configured: true,
      device: ctx.device,
      itemNames: hubState?.device_overrides?.[ctx.fullId]?.item_names ?? {},
      zwaveNode: ctx.zwaveNode,
      zwaveSiblings: ctx.zwaveSiblings,
      hubOnline: hub.last_seen_at != null,
      recentEvents: hubDeviceEventsToLive(hubState?.device_live_events, ctx.fullId),
    });
  }

  const ctx = resolveZigbeeDeviceContext(param, devices, hubState);
  if (!ctx) {
    return NextResponse.json({ error: "device_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    configured: true,
    device: ctx.device,
    itemNames: hubState?.device_overrides?.[ctx.fullId]?.item_names ?? {},
    zwaveNode: null,
    zwaveSiblings: [],
    hubOnline: hub.last_seen_at != null,
    recentEvents: hubDeviceEventsToLive(hubState?.device_live_events, ctx.fullId),
  });
}
