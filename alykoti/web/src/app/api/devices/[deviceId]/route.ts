import { NextResponse } from "next/server";
import { hubDeviceEventsToLive } from "@/lib/device-events";
import { inferProtocolFromId } from "@/lib/device-protocol";
import { parseHubHomeDevices } from "@/lib/hub-lights";
import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";
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
  const devices = parseHubHomeDevices(
    hubState?.home_devices,
    hubState?.lights,
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

  const decoded = decodeURIComponent(param);
  const fullId = decoded.includes(":") ? decoded : `zigbee:${decoded}`;
  const device = devices.find((d) => d.id === fullId);
  if (!device) {
    return NextResponse.json({ error: "device_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    configured: true,
    device,
    itemNames: hubState?.device_overrides?.[device.id]?.item_names ?? {},
    zwaveNode: null,
    zwaveSiblings: [],
    hubOnline: hub.last_seen_at != null,
    recentEvents: hubDeviceEventsToLive(hubState?.device_live_events, fullId),
  });
}
