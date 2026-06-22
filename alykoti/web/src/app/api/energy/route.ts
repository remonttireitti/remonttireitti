import { NextResponse } from "next/server";
import {
  computeDailyKwh,
  consumptionTodayKwh,
  fetchEnergySamples,
  findEmMeters,
} from "@/lib/energy-samples";
import { isHubOnline } from "@/lib/device-status";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { EnergyPhases } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MeterLive = {
  power_w: number | null;
  power_kw: number | null;
  energy_wh: number | null;
  phases: EnergyPhases;
};

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

  const meters = findEmMeters(hub.state.home_devices);
  const since = new Date(Date.now() - 8 * 86_400_000);

  const result = await Promise.all(
    meters.map(async ({ id, device }) => {
      const samples = await fetchEnergySamples(hub.id, id, since);
      const liveWh = device.energy_wh ?? null;
      const powerW = device.power_w ?? null;
      const powerKw =
        device.power_kw ??
        (powerW != null && Number.isFinite(powerW) ? powerW / 1000 : null);

      const live: MeterLive = {
        power_w: powerW,
        power_kw: powerKw,
        energy_wh: liveWh,
        phases: device.em_phases ?? {},
      };

      return {
        id,
        name: device.name,
        host: device.host,
        model: device.model,
        live,
        today_kwh: consumptionTodayKwh(samples, liveWh),
        daily: computeDailyKwh(samples, 7, liveWh),
      };
    }),
  );

  return NextResponse.json({
    hubOnline: isHubOnline(hub.last_seen_at),
    meters: result,
  });
}
