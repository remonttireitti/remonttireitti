import { NextResponse } from "next/server";
import { inferProtocolFromId } from "@/lib/device-protocol";
import { parseHubHomeDevices } from "@/lib/hub-lights";
import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const device = devices.find((d) => d.id === fullId);
  if (!device) {
    return NextResponse.json({ error: "device_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    configured: true,
    device,
    hubOnline: hub.last_seen_at != null,
  });
}
