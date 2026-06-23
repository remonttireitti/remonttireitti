import { NextResponse } from "next/server";
import { groupDevices, parseHubHomeDevices, prepareDevicesForList } from "@/lib/hub-lights";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import { fetchPrimaryHub } from "@/lib/hubs";
import { isHubOnline } from "@/lib/device-status";
import { anchorForLight } from "@/lib/lights-config";
import { createClient } from "@/lib/supabase/server";
import { fetchLights, isZigbeeConfigured } from "@/lib/zigbee2mqtt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const hub = await fetchPrimaryHub(supabase, user.id);
    const hubOnline = hub ? isHubOnline(hub.last_seen_at) : false;
    const homeDevices = hub
      ? normalizeHomeDevices(hub.state?.home_devices, {
          integrations: hub.state?.integrations,
          airthingsState: hub.state,
        })
      : undefined;
    const devices = prepareDevicesForList(
      parseHubHomeDevices(homeDevices, hub?.state?.lights, hub?.state?.device_overrides),
      homeDevices,
      hub?.state?.zwave_nodes,
      hub?.state?.device_overrides,
    );
    const grouped = groupDevices(devices, hub?.state?.device_overrides);

    if (hub && (hubOnline || devices.length > 0)) {
      return NextResponse.json({
        configured: true,
        source: "hub",
        hubOnline,
        devices,
        ...grouped,
        lights: grouped.lights,
        switches: grouped.switches,
        sensors: grouped.sensors,
        locks: grouped.locks,
        other: grouped.other,
      });
    }
  }

  if (isZigbeeConfigured()) {
    try {
      const lights = await fetchLights();
      const devices = lights.map((light) => ({
        id: `zigbee:${light.id}`,
        name: light.name,
        on: light.on,
        brightness: light.brightness,
        reachable: light.reachable,
        roomAnchorId: anchorForLight(light.id) ?? null,
        protocol: "zigbee" as const,
        kind: "light" as const,
        room: null,
        controllable: true,
        mqttSetTopic: null,
      }));
      return NextResponse.json({
        configured: true,
        source: "mqtt",
        hubOnline: false,
        devices,
        lights: devices,
        switches: [],
        other: [],
        sensors: [],
        locks: [],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Zigbee2MQTT error";
      return NextResponse.json(
        { configured: true, source: "mqtt", hubOnline: false, devices: [], lights: [], error: message },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    configured: false,
    source: null,
    hubOnline: false,
    devices: [],
    lights: [],
    switches: [],
    other: [],
    message: "Rekisteröi Yellow ja käynnistä synkki-agentti.",
  });
}
