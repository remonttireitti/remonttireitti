import { NextResponse } from "next/server";
import {
  aggregateDailyKwh,
  computeDailyKwh,
  computeEnergyInsights,
  computeEnergyStatistics,
  computeModeration,
  consumptionTodayKwh,
  fetchDailyTempAverages,
  fetchEnergySamples,
  findEmMeters,
  sumKwhFromDaily,
} from "@/lib/energy-samples";
import { isHubOnline } from "@/lib/device-status";
import { resolveWifiChannelDisplayName } from "@/lib/device-item-overrides";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { EnergyPhases, HubState } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HISTORY_DAYS = 30;

type MeterLive = {
  power_w: number | null;
  power_kw: number | null;
  energy_wh: number | null;
  phases: EnergyPhases;
};

function sumPowerKw(meters: { live: MeterLive }[]): number | null {
  let sum = 0;
  let any = false;
  for (const m of meters) {
    const kw =
      m.live.power_kw ??
      (m.live.power_w != null && Number.isFinite(m.live.power_w) ? m.live.power_w / 1000 : null);
    if (kw != null) {
      sum += kw;
      any = true;
    }
  }
  return any ? sum : null;
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

  const meters = findEmMeters(hub.state.home_devices);
  const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000);
  const overrides = (hub.state as HubState)?.device_overrides;

  const meterResults = await Promise.all(
    meters.map(async ({ id, device }) => {
      const samples = await fetchEnergySamples(hub.id, id, since);
      const liveWh = device.energy_wh ?? null;
      const powerW = device.power_w ?? null;
      const powerKw =
        device.power_kw ??
        (powerW != null && Number.isFinite(powerW) ? powerW / 1000 : null);
      const phases = device.em_phases ?? {};

      const live: MeterLive = {
        power_w: powerW,
        power_kw: powerKw,
        energy_wh: liveWh,
        phases,
      };

      const displayName = resolveWifiChannelDisplayName(id, device.name, overrides);

      return {
        id,
        name: displayName,
        host: device.host,
        model: device.model,
        live,
        today_kwh: consumptionTodayKwh(samples, liveWh),
        daily: computeDailyKwh(samples, 7, liveWh),
        daily30: computeDailyKwh(samples, HISTORY_DAYS, liveWh),
      };
    }),
  );

  const aggregatedDaily = aggregateDailyKwh(meterResults.map((m) => m.daily30));
  const todayVals = meterResults
    .map((m) => m.today_kwh)
    .filter((v): v is number => v != null && v >= 0);
  const todayKwh = todayVals.length ? todayVals.reduce((s, v) => s + v, 0) : null;
  const weekKwh = sumKwhFromDaily(aggregatedDaily, 7);
  const monthKwh = sumKwhFromDaily(aggregatedDaily, HISTORY_DAYS);

  const completeDaily = aggregatedDaily.filter((d) => d.kwh != null);
  const avgDaily30 = completeDaily.length
    ? completeDaily.reduce((s, d) => s + d.kwh!, 0) / completeDaily.length
    : null;

  const [outdoorTemp, indoorTemp] = await Promise.all([
    fetchDailyTempAverages(hub.id, "outdoor_temp_c", since),
    fetchDailyTempAverages(hub.id, "temperature_c", since),
  ]);

  const stats7 = computeEnergyStatistics(aggregatedDaily, 7);
  const stats30 = computeEnergyStatistics(aggregatedDaily, 30);

  const metersForClient = meterResults.map(({ daily30: _d, ...rest }) => rest);

  return NextResponse.json({
    hubOnline: isHubOnline(hub.last_seen_at),
    summary: {
      power_kw_total: sumPowerKw(meterResults),
      today_kwh: todayKwh,
      week_kwh: weekKwh,
      month_kwh: monthKwh,
    },
    moderation: computeModeration(todayKwh, avgDaily30),
    trend: {
      daily: aggregatedDaily,
      outdoor_temp: outdoorTemp,
      indoor_temp: indoorTemp,
    },
    statistics: {
      week: stats7,
      month: stats30,
    },
    insights: computeEnergyInsights(todayKwh, aggregatedDaily, outdoorTemp, indoorTemp),
    meters: metersForClient,
  });
}
