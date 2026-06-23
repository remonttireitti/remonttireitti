import { NextResponse } from "next/server";
import { hubDeviceEventsToLive } from "@/lib/device-events";
import { mergeZwaveNodeOverrides } from "@/lib/device-item-overrides";
import { inferProtocolFromId, parseZwaveDeviceId } from "@/lib/device-protocol";
import { parseHubHomeDevices, type HubLightDevice } from "@/lib/hub-lights";
import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";
import { zwaveNodeForDevice, zwaveNodeForParam, zwaveNodeId } from "@/lib/zwave-detail";
import type { HubState, ZwaveNodeDetail } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function deviceIdFromParam(param: string, protocol: "zigbee" | "zwave"): string {
  const decoded = decodeURIComponent(param);
  if (decoded.includes(":")) return decoded;
  return `${protocol}:${decoded}`;
}

function deviceFromZwaveNode(
  node: ZwaveNodeDetail,
  siblings: HubLightDevice[],
): HubLightDevice | null {
  if (siblings.length > 0) {
    const sorted = [...siblings].sort((a, b) => (a.endpoint ?? 0) - (b.endpoint ?? 0));
    const base = sorted[0]!;
    const baseName = node.name || base.name.replace(/\s*\((?:Kanava|EP) \d+\)\s*$/i, "").trim();
    return {
      ...base,
      id: zwaveNodeId(node.node_id),
      name: baseName,
      room: node.room ?? base.room,
      controllable: sorted.some((e) => e.controllable),
      capabilitiesLabel:
        sorted.length > 1 ? `${sorted.length} kanavaa` : base.capabilitiesLabel,
    };
  }
  const ep = node.endpoints[0];
  if (!ep) return null;
  return {
    id: zwaveNodeId(node.node_id),
    name: node.name,
    on: ep.on === true,
    brightness: ep.brightness ?? null,
    reachable: true,
    roomAnchorId: null,
    protocol: "zwave",
    kind: "other",
    room: node.room ?? null,
    controllable: ep.controllable === true,
    mqttSetTopic: ep.mqtt_set_topic ?? null,
    lockSetTopic: null,
    locked: null,
    capabilities: ep.capabilities ?? [],
    capabilitiesLabel: ep.label,
    readingLabel: null,
    temperature_c: null,
    humidity_pct: null,
    co2_ppm: null,
    illuminance_lux: null,
    sensor_state: null,
    endpoint: ep.endpoint,
    node_id: node.node_id,
    power_w: null,
    role: "other_control",
  };
}

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
  const fullId =
    protocol === "zigbee" || protocol === "zwave"
      ? deviceIdFromParam(param, protocol)
      : decodeURIComponent(param);

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

  const devices = parseHubHomeDevices(
    hub.state?.home_devices,
    hub.state?.lights,
    hub.state?.device_overrides,
  );
  const hubState = hub.state as HubState | undefined;
  let device = devices.find((d) => d.id === fullId);

  const zwaveNodeRaw =
    protocol === "zwave"
      ? zwaveNodeForDevice(fullId, hubState?.zwave_nodes) ??
        zwaveNodeForParam(param, hubState?.zwave_nodes)
      : null;

  const zwaveNode = zwaveNodeRaw
    ? mergeZwaveNodeOverrides(zwaveNodeRaw, hubState?.device_overrides)
    : null;

  const zwaveSiblings =
    protocol === "zwave" && zwaveNode
      ? devices.filter((d) => {
          const p = parseZwaveDeviceId(d.id);
          return p?.nodeId === zwaveNode.node_id;
        })
      : [];

  if (!device && zwaveNode) {
    device = deviceFromZwaveNode(zwaveNode, zwaveSiblings) ?? undefined;
  }

  if (!device) {
    return NextResponse.json({ error: "device_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    configured: true,
    device,
    itemNames: hubState?.device_overrides?.[device.id]?.item_names ?? {},
    zwaveNode,
    zwaveSiblings,
    hubOnline: hub.last_seen_at != null,
    recentEvents: hubDeviceEventsToLive(hub.state?.device_live_events, fullId),
  });
}
