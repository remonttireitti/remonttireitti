import { NextResponse } from "next/server";
import { uiMirrorPartnerIds } from "@/lib/automation-presets";
import { parseHubHomeDevices } from "@/lib/hub-lights";
import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";
import { isZigbeeConfigured, setLightState } from "@/lib/zigbee2mqtt";
import { parseZwaveDeviceId } from "@/lib/device-protocol";
import type { HubState } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolveZwaveTopics(
  id: string,
  hubState: HubState,
  deviceMqtt?: string | null,
  deviceLock?: string | null,
): { mqtt_set_topic?: string; lock_set_topic?: string } {
  const raw = hubState.home_devices?.[id];
  let mqtt_set_topic = deviceMqtt ?? raw?.mqtt_set_topic ?? undefined;
  let lock_set_topic = deviceLock ?? raw?.lock_set_topic ?? undefined;
  if (mqtt_set_topic || lock_set_topic) {
    return { mqtt_set_topic, lock_set_topic };
  }

  const parsed = parseZwaveDeviceId(id);
  if (!parsed) return { mqtt_set_topic, lock_set_topic };

  const node = hubState.zwave_nodes?.[String(parsed.nodeId)];
  const endpoint = parsed.endpoint;
  let ep =
    node?.endpoints.find((row) => row.device_id === id) ??
    (endpoint != null ? node?.endpoints.find((row) => row.endpoint === endpoint) : undefined);

  if (!ep && parsed.endpoint == null && node?.endpoints?.length) {
    ep =
      node.endpoints.find((row) => row.controllable && row.mqtt_set_topic) ??
      node.endpoints.find((row) => row.mqtt_set_topic) ??
      node.endpoints[0];
  } else if (!ep) {
    ep = node?.endpoints[0];
  }

  if (!mqtt_set_topic && ep?.mqtt_set_topic) mqtt_set_topic = ep.mqtt_set_topic;
  if (!lock_set_topic) {
    const epRaw = ep?.device_id ? hubState.home_devices?.[ep.device_id] : undefined;
    lock_set_topic = epRaw?.lock_set_topic ?? raw?.lock_set_topic ?? undefined;
  }
  return { mqtt_set_topic, lock_set_topic };
}

function findHubDevice(
  devices: ReturnType<typeof parseHubHomeDevices>,
  id: string,
) {
  return (
    devices.find((d) => d.id === id) ??
    devices.find((d) => {
      const a = parseZwaveDeviceId(d.id);
      const b = parseZwaveDeviceId(id);
      if (!a || !b) return false;
      return a.nodeId === b.nodeId && (a.endpoint ?? 1) === (b.endpoint ?? 1);
    })
  );
}

function buildSetDevicePayload(
  id: string,
  on: boolean,
  hubState: HubState,
  devices: ReturnType<typeof parseHubHomeDevices>,
  brightness?: number,
  color?: { hue?: number; saturation?: number; color_temp?: number },
): { payload: Record<string, unknown>; error?: string } {
  const device = findHubDevice(devices, id);
  const payload: Record<string, unknown> = { id: device?.id ?? id, on, brightness: brightness ?? null };
  if (color) payload.color = color;
  const resolvedId = String(payload.id);
  const zwaveTopics = resolvedId.startsWith("zwave:")
    ? resolveZwaveTopics(resolvedId, hubState, device?.mqttSetTopic, device?.lockSetTopic)
    : {};
  if (zwaveTopics.mqtt_set_topic) payload.mqtt_set_topic = zwaveTopics.mqtt_set_topic;
  else if (device?.mqttSetTopic) payload.mqtt_set_topic = device.mqttSetTopic;
  if (zwaveTopics.lock_set_topic) payload.lock_set_topic = zwaveTopics.lock_set_topic;
  else if (device?.lockSetTopic) payload.lock_set_topic = device.lockSetTopic;
  if (
    resolvedId.startsWith("zwave:") &&
    typeof payload.mqtt_set_topic !== "string" &&
    typeof payload.lock_set_topic !== "string"
  ) {
    return {
      payload,
      error: "Laitteen ohjauspolku puuttuu — odota synkkiä tai avaa laite uudelleen.",
    };
  }
  if (device?.protocol === "shelly") {
    const raw = hubState.home_devices?.[resolvedId];
    if (raw?.host) payload.host = raw.host;
    if (typeof raw?.channel === "number") payload.channel = raw.channel;
    if (typeof raw?.gen === "number") payload.gen = raw.gen;
  }
  if (device?.protocol === "tasmota") {
    const raw = hubState.home_devices?.[resolvedId];
    if (raw?.host) payload.host = raw.host;
    if (typeof raw?.channel === "number") payload.channel = raw.channel;
  }
  return { payload };
}

export async function POST(request: Request) {
  let body: {
    id?: string;
    on?: boolean;
    brightness?: number;
    color?: { hue?: number; saturation?: number; color_temp?: number };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { id, on, brightness, color } = body;
  if (!id || typeof on !== "boolean") {
    return NextResponse.json({ ok: false, error: "id and on required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Kirjaudu sisään." }, { status: 401 });
  }

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (hub) {
    const hubState = (hub.state as HubState) ?? {};
    const devices = parseHubHomeDevices(hubState.home_devices, hubState.lights, hubState.device_overrides);
    const primary = buildSetDevicePayload(id, on, hubState, devices, brightness, color);
    if (primary.error) {
      return NextResponse.json({ ok: false, error: primary.error }, { status: 503 });
    }

    const targetIds = [
      ...new Set([String(primary.payload.id), ...uiMirrorPartnerIds(id, devices)]),
    ];
    const commandIds: string[] = [];

    for (const targetId of targetIds) {
      const built = buildSetDevicePayload(
        targetId,
        on,
        hubState,
        devices,
        brightness,
        targetId === id ? color : undefined,
      );
      if (built.error) continue;
      if (targetId !== id) built.payload._skip_ui_mirror = true;
      const { data, error } = await supabase
        .from("commands")
        .insert({
          hub_id: hub.id,
          user_id: user.id,
          command: "set_device",
          payload: built.payload,
        })
        .select("id")
        .single();
      if (error) {
        return NextResponse.json({ ok: false, error: "Komennon lähetys epäonnistui." }, { status: 500 });
      }
      commandIds.push(data.id);
    }

    return NextResponse.json({
      ok: true,
      queued: true,
      commandId: commandIds[0],
      mirrorCommandIds: commandIds.slice(1),
    });
  }

  if (isZigbeeConfigured()) {
    const zigbeeId = id.startsWith("zigbee:") ? id.slice("zigbee:".length) : id;
    try {
      if (color?.hue != null) {
        const { setLightColor } = await import("@/lib/zigbee2mqtt");
        await setLightColor(zigbeeId, {
          on,
          brightness,
          hue: color.hue,
          saturation: color.saturation ?? 254,
          color_temp: color.color_temp,
        });
      } else {
        await setLightState(zigbeeId, on, brightness);
      }
      return NextResponse.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Control failed";
      return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: false, error: "Hubia ei löydy." }, { status: 503 });
}
