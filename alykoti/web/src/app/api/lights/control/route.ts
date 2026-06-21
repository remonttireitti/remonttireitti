import { NextResponse } from "next/server";
import { parseHubHomeDevices } from "@/lib/hub-lights";
import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";
import { isZigbeeConfigured, setLightState } from "@/lib/zigbee2mqtt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { id?: string; on?: boolean; brightness?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { id, on, brightness } = body;
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
    const devices = parseHubHomeDevices(hub.state?.home_devices, hub.state?.lights, hub.state?.device_overrides);
    const device = devices.find((d) => d.id === id);
    const payload: Record<string, unknown> = { id, on, brightness: brightness ?? null };
    if (device?.mqttSetTopic) {
      payload.mqtt_set_topic = device.mqttSetTopic;
    }
    if (device?.protocol === "shelly") {
      const raw = hub.state.home_devices?.[id];
      if (raw?.host) payload.host = raw.host;
      if (typeof raw?.channel === "number") payload.channel = raw.channel;
      if (typeof raw?.gen === "number") payload.gen = raw.gen;
    }
    if (device?.protocol === "tasmota") {
      const raw = hub.state.home_devices?.[id];
      if (raw?.host) payload.host = raw.host;
      if (typeof raw?.channel === "number") payload.channel = raw.channel;
    }

    const { error } = await supabase.from("commands").insert({
      hub_id: hub.id,
      user_id: user.id,
      command: "set_device",
      payload,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: "Komennon lähetys epäonnistui." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, queued: true });
  }

  if (isZigbeeConfigured()) {
    const zigbeeId = id.startsWith("zigbee:") ? id.slice("zigbee:".length) : id;
    try {
      await setLightState(zigbeeId, on, brightness);
      return NextResponse.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Control failed";
      return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: false, error: "Hubia ei löydy." }, { status: 503 });
}
