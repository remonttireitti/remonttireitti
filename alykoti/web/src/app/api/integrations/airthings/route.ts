import { NextResponse } from "next/server";
import { isAirthingsConfigured, listAirthingsDevices, testAirthingsConnection } from "@/lib/airthings";
import { isHubOnline } from "@/lib/device-status";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { AirthingsDeviceConfig, HubHomeDevice } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function liveForDevice(
  serial: string,
  home: Record<string, HubHomeDevice> | undefined,
): HubHomeDevice | null {
  const id = `airthings:${serial}`;
  return home?.[id] ?? null;
}

export async function GET() {
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

  const apiConfigured = isAirthingsConfigured();
  const configured = hub.state.integrations?.airthings?.devices ?? [];
  const home = normalizeHomeDevices(hub.state.home_devices, {
    integrations: hub.state.integrations,
    airthingsState: hub.state,
  });

  const available = apiConfigured ? await listAirthingsDevices() : [];

  const live = configured.map((dev: AirthingsDeviceConfig) => {
    const device = liveForDevice(dev.serial, home ?? undefined);
    return {
      ...dev,
      reachable: device != null,
      reading: device
        ? {
            temperature_c: device.temperature_c,
            humidity_pct: device.humidity_pct,
            co2_ppm: device.co2_ppm,
            tvoc_ppb: device.tvoc_ppb,
          }
        : null,
    };
  });

  return NextResponse.json({
    configured: true,
    apiConfigured,
    hubOnline: isHubOnline(hub.last_seen_at),
    devices: configured,
    available,
    live,
    hubCo2: hub.state.co2_ppm ?? null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAirthingsConfigured()) {
    return NextResponse.json({ error: "Airthings API ei ole konfiguroitu." }, { status: 503 });
  }

  let body: { serial?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const samples = await testAirthingsConnection(body.serial);
  if (!samples) {
    return NextResponse.json({ error: "Yhteys Airthingsiin epäonnistui." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, samples });
}
