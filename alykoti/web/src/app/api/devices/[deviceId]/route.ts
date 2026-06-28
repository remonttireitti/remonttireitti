import { NextResponse } from "next/server";
import { inferDeviceApiProtocol } from "@/lib/device-protocol";
import { jsonSafe } from "@/lib/json-safe";
import { fetchPrimaryHub } from "@/lib/hubs";
import { loadZwaveDeviceDetail } from "@/lib/zwave-device-detail-load";
import { delegateToYellowApi } from "@/lib/local-api-route";
import { createClient } from "@/lib/supabase/server";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import { parseHubHomeDevices, prepareDevicesForList } from "@/lib/hub-lights";
import { resolveZigbeeDeviceContext } from "@/lib/zigbee-device-resolve";
import { hubDeviceEventsToLive } from "@/lib/device-events";
import { resolveDeviceItemNames } from "@/lib/device-item-overrides";
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
  const protocol = inferDeviceApiProtocol(param, protocolParam);

  const yellowPath = `/api/devices/${encodeURIComponent(param)}${
    protocolParam ? `?protocol=${encodeURIComponent(protocolParam)}` : ""
  }`;
  const local = await delegateToYellowApi(request, yellowPath);
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

  if (protocol === "zwave") {
    try {
      const detail = loadZwaveDeviceDetail(hub, param);
      if (!detail) {
        return NextResponse.json({ error: "device_not_found" }, { status: 404 });
      }
      return NextResponse.json(
        jsonSafe({
          configured: true,
          ...detail,
        }),
      );
    } catch (err) {
      console.error("zwave device detail failed", param, err);
      return NextResponse.json({ error: "device_detail_failed" }, { status: 500 });
    }
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

  const ctx = resolveZigbeeDeviceContext(param, devices, hubState);
  if (!ctx) {
    return NextResponse.json({ error: "device_not_found" }, { status: 404 });
  }

  return NextResponse.json(
    jsonSafe({
      configured: true,
      device: ctx.device,
      itemNames: resolveDeviceItemNames(ctx.fullId, hubState?.device_overrides),
      zwaveNode: null,
      zwaveSiblings: [],
      hubOnline: hub.last_seen_at != null,
      recentEvents: hubDeviceEventsToLive(hubState?.device_live_events, ctx.fullId),
    }),
  );
}
