import { NextResponse } from "next/server";
import { deviceMetricKey } from "@/lib/device-metrics";
import {
  appendCostInsights,
  computeDailyKwh,
  computeEnergyInsights,
  computeEnergyStatistics,
  computeExpectedKwhSoFar,
  computeModeration,
  consumptionTodayKwh,
  fetchDailyTempAverages,
  fetchEnergySamples,
  findEmMeters,
  findPrimaryAirthingsDevice,
  findPrimaryEmMeter,
  sumKwhFromDaily,
} from "@/lib/energy-samples";
import { computeEnergyCostSummary } from "@/lib/energy-cost";
import { meterLivePowerKw } from "@/lib/energy-live";
import { fetchElectricityPrices } from "@/lib/electricity-prices";
import { fetchWeatherDailyTemps, mergeDailyTemps } from "@/lib/weather-daily";
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
    const kw = meterLivePowerKw(m.live);
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
  const primaryMeterId = findPrimaryEmMeter(meters);
  const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000);
  const overrides = (hub.state as HubState)?.device_overrides;

  let primarySamples: Awaited<ReturnType<typeof fetchEnergySamples>> = [];
  let primaryLiveWh: number | null = null;

  const meterResults = await Promise.all(
    meters.map(async ({ id, device }) => {
      const samples = await fetchEnergySamples(hub.id, id, since);
      const liveWh = device.energy_wh ?? null;
      if (id === primaryMeterId) {
        primarySamples = samples;
        primaryLiveWh = liveWh;
      }
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
      const resolvedKw = meterLivePowerKw(live);
      if (resolvedKw != null) {
        live.power_kw = resolvedKw;
        live.power_w = resolvedKw * 1000;
      }

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

  const primaryMeter = primaryMeterId
    ? meterResults.find((m) => m.id === primaryMeterId)
    : undefined;
  const aggregatedDaily = primaryMeter?.daily30 ?? [];
  const todayKwh = primaryMeter?.today_kwh ?? null;
  const weekKwh = sumKwhFromDaily(aggregatedDaily, 7);
  const monthKwh = sumKwhFromDaily(aggregatedDaily, HISTORY_DAYS);

  const completeDaily = aggregatedDaily.filter((d) => d.kwh != null);
  const avgDaily30 = completeDaily.length
    ? completeDaily.reduce((s, d) => s + d.kwh!, 0) / completeDaily.length
    : null;

  const airthingsId = findPrimaryAirthingsDevice(hub.state.home_devices);
  const indoorMetric = airthingsId
    ? deviceMetricKey(airthingsId, "temperature_c")
    : null;

  const [ivOutdoor, weatherOutdoor, indoorTemp] = await Promise.all([
    fetchDailyTempAverages(hub.id, "outdoor_temp_c", since),
    fetchWeatherDailyTemps(since),
    indoorMetric
      ? fetchDailyTempAverages(hub.id, indoorMetric, since)
      : Promise.resolve([]),
  ]);
  const outdoorTemp = mergeDailyTemps(ivOutdoor, weatherOutdoor);

  const stats7 = computeEnergyStatistics(aggregatedDaily, 7);
  const stats30 = computeEnergyStatistics(aggregatedDaily, 30);

  let prices = null;
  try {
    prices = await fetchElectricityPrices();
  } catch {
    prices = null;
  }
  const cost = computeEnergyCostSummary(aggregatedDaily, prices);
  const expectedSoFar = computeExpectedKwhSoFar(
    primarySamples,
    avgDaily30,
    new Date(),
    primaryLiveWh,
  );
  const insights = appendCostInsights(
    computeEnergyInsights(
      todayKwh,
      aggregatedDaily,
      outdoorTemp,
      indoorTemp,
      primarySamples,
      new Date(),
      expectedSoFar,
    ),
    cost,
  );

  const metersForClient = meterResults.map(({ daily30: _d, ...rest }) => ({
    ...rest,
    is_primary: rest.id === primaryMeterId,
    counts_in_total: rest.id === primaryMeterId,
  }));

  return NextResponse.json({
    hubOnline: isHubOnline(hub.last_seen_at),
    primary_meter_id: primaryMeterId,
    summary: {
      power_kw_total: primaryMeter ? sumPowerKw([primaryMeter]) : null,
      today_kwh: todayKwh,
      week_kwh: weekKwh,
      month_kwh: monthKwh,
    },
    moderation: computeModeration(
      todayKwh,
      expectedSoFar,
      new Date(),
      primaryMeter ? meterLivePowerKw(primaryMeter.live) : null,
    ),
    trend: {
      daily: aggregatedDaily,
      outdoor_temp: outdoorTemp,
      indoor_temp: indoorTemp,
    },
    statistics: {
      week: stats7,
      month: stats30,
    },
    cost,
    insights,
    meters: metersForClient,
  });
}
