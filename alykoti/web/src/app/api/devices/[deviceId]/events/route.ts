import { NextResponse } from "next/server";
import mqtt, { type MqttClient } from "mqtt";
import { formatZigbeeEvent, formatZwaveEvent, type DeviceLiveEvent } from "@/lib/device-events";
import { inferProtocolFromId, parseZwaveDeviceId } from "@/lib/device-protocol";
import { parseHubHomeDevices } from "@/lib/hub-lights";
import { fetchPrimaryHub } from "@/lib/hubs";
import {
  isMqttConfigured,
  parseMqttHostPort,
  zigbeeMqttUrl,
  zigbeeTopicPrefix,
  zwaveTopicPrefix,
} from "@/lib/mqtt-broker";
import { createClient } from "@/lib/supabase/server";
import { resolveZwaveDeviceContext } from "@/lib/zwave-device-resolve";
import type { HubState } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function deviceIdFromParam(param: string, protocol: "zigbee" | "zwave"): string {
  const decoded = decodeURIComponent(param);
  if (decoded.includes(":")) return decoded;
  return `${protocol}:${decoded}`;
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

  let fullId: string;
  let eventDeviceId: string;
  let deviceName: string;

  if (protocol === "zwave") {
    const ctx = resolveZwaveDeviceContext(param, devices, hubState);
    if (!ctx) {
      return NextResponse.json({ error: "device_not_found" }, { status: 404 });
    }
    fullId = ctx.fullId;
    eventDeviceId = ctx.fullId;
    deviceName = ctx.device.name;
  } else {
    fullId = deviceIdFromParam(param, "zigbee");
    const device = devices.find((d) => d.id === fullId);
    if (!device) {
      return NextResponse.json({ error: "device_not_found" }, { status: 404 });
    }
    eventDeviceId = device.id;
    deviceName = device.name;
  }

  if (!isMqttConfigured()) {
    return NextResponse.json({ error: "mqtt_not_configured" }, { status: 503 });
  }

  const brokerUrl = zigbeeMqttUrl()!;
  const { host, port } = parseMqttHostPort(brokerUrl);
  const zPrefix = zigbeeTopicPrefix();
  const zwPrefix = zwaveTopicPrefix();

  let subscribeTopics: string[] = [];
  if (fullId.startsWith("zigbee:")) {
    const name = fullId.slice("zigbee:".length);
    subscribeTopics = [`${zPrefix}/${name}`];
  } else if (fullId.startsWith("zwave:")) {
    const parsed = parseZwaveDeviceId(fullId);
    if (parsed) {
      subscribeTopics = [`${zwPrefix}/nodeID_${parsed.nodeId}/#`];
    }
  }

  if (subscribeTopics.length === 0) {
    return NextResponse.json({ error: "unsupported_device" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let client: MqttClient | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (event: DeviceLiveEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(sseLine("event", event)));
      };

      controller.enqueue(
        encoder.encode(
          sseLine("ready", {
            device_id: fullId,
            name: deviceName,
            topics: subscribeTopics,
          }),
        ),
      );

      client = mqtt.connect(brokerUrl, {
        host,
        port,
        connectTimeout: 5_000,
        reconnectPeriod: 3_000,
      });

      client.on("connect", () => {
        for (const topic of subscribeTopics) {
          client?.subscribe(topic);
        }
        controller.enqueue(encoder.encode(sseLine("connected", { topics: subscribeTopics })));
      });

      client.on("message", (topic, payloadBuf) => {
        const rawText = payloadBuf.toString();
        let payload: Record<string, unknown>;
        try {
          const parsed = JSON.parse(rawText) as unknown;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
          payload = parsed as Record<string, unknown>;
        } catch {
          if (fullId.startsWith("zwave:")) {
            const evt = formatZwaveEvent(topic, rawText);
            if (evt) push({ ...evt, topic });
          }
          return;
        }

        let evt: DeviceLiveEvent | null = null;
        if (fullId.startsWith("zigbee:")) {
          evt = formatZigbeeEvent(payload);
        } else {
          evt = formatZwaveEvent(topic, payload.value ?? payload.currentValue ?? payload);
        }
        if (evt) push({ ...evt, topic });
      });

      client.on("error", (err) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(sseLine("error", { message: err.message || "mqtt_error" })),
        );
      });
    },
    cancel() {
      closed = true;
      client?.end(true);
      client = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
