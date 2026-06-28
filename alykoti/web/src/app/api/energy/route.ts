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
  helsinkiDateKey,
  isTodayKwhUnreliable,
  sanitizeDailyTrend,
  sumKwhFromDaily,
} from "@/lib/energy-samples";
import { computeEnergyCostSummary } from "@/lib/energy-cost";
import { buildEmMeterLive } from "@/lib/energy-meter-live";
import { meterLivePowerKw } from "@/lib/energy-live";
import { fetchElectricityPricesCached } from "@/lib/electricity-prices";
import { fetchWeatherDailyTemps, mergeDailyTemps } from "@/lib/weather-daily";
import { isHubOnline } from "@/lib/device-status";
import { resolveWifiChannelDisplayName } from "@/lib/device-item-overrides";
import { fetchPrimaryHub } from "@/lib/hubs";
import { delegateToYellowApi } from "@/lib/local-api-route";
import type { HubState } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HISTORY_DAYS = 30;

export async function GET() {
  const local = await delegateToYellowApi(new Request("http://local"), "/api/energy");
  if (local) return local;

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

  const airthingsId = findPrimaryAirthingsDevice(hub.state.home_devices);
  const indoorMetric = airthingsId
    ? deviceMetricKey(airthingsId, "temperature_c")
    : null;

  const [primarySamples, ivOutdoor, prices, indoorTemp] = await Promise.all([
    primaryMeterId
      ? fetchEnergySamples(hub.id, primaryMeterId, since)
      : Promise.resolve([]),
    fetchDailyTempAverages(hub.id, "outdoor_temp_c", since),
    fetchElectricityPricesCached().catch(() => null),
    indoorMetric
      ? fetchDailyTempAverages(hub.id, indoorMetric, since)
      : Promise.resolve([]),
  ]);

  const ivOutdoorComplete = ivOutdoor.filter((d) => d.avg_c != null).length;
  const weatherOutdoor =
    ivOutdoorComplete >= 5 ? [] : await fetchWeatherDailyTemps(since);
  const outdoorTemp = mergeDailyTemps(ivOutdoor, weatherOutdoor);

  const primaryMeta = primaryMeterId
    ? meters.find((m) => m.id === primaryMeterId)
    : undefined;
  const primaryLiveWh = primaryMeta?.device.energy_wh ?? null;

  const aggregatedDaily = sanitizeDailyTrend(
    computeDailyKwh(primarySamples, HISTORY_DAYS, primaryLiveWh),
  );
  const todayKwh = consumptionTodayKwh(primarySamples, primaryLiveWh);
  const weekKwh = sumKwhFromDaily(aggregatedDaily, 7);
  const monthKwh = sumKwhFromDaily(aggregatedDaily, HISTORY_DAYS);

  const completeDaily = aggregatedDaily.filter((d) => d.kwh != null);
  const avgDaily30 = completeDaily.length
    ? completeDaily.reduce((s, d) => s + d.kwh!, 0) / completeDaily.length
    : null;

  const stats7 = computeEnergyStatistics(aggregatedDaily, 7);
  const stats30 = computeEnergyStatistics(aggregatedDaily, 30);
  const cost = computeEnergyCostSummary(aggregatedDaily, prices);

  const liveKw = primaryMeta ? meterLivePowerKw(buildEmMeterLive(primaryMeta.device)) : null;
  const todayKey = helsinkiDateKey(new Date().toISOString());
  const todayUnreliable = isTodayKwhUnreliable(todayKwh, liveKw);
  const displayTodayKwh = todayUnreliable ? null : todayKwh;

  const trendDaily = todayUnreliable
    ? aggregatedDaily.map((d) => (d.date === todayKey ? { ...d, kwh: null } : d))
    : aggregatedDaily;

  const displayCost = todayUnreliable
    ? {
        ...cost,
        today_kwh: null,
        today_cost_eur: null,
        today_vs_yesterday_pct: null,
      }
    : cost;

  const expectedSoFar = computeExpectedKwhSoFar(
    primarySamples,
    avgDaily30,
    new Date(),
    primaryLiveWh,
  );
  const insights = appendCostInsights(
    computeEnergyInsights(
      displayTodayKwh,
      trendDaily,
      outdoorTemp,
      indoorTemp,
      primarySamples,
      new Date(),
      expectedSoFar,
      !todayUnreliable,
    ),
    displayCost,
  );

  const metersForClient = meters.map(({ id, device }) => {
    const live = buildEmMeterLive(device);
    const isPrimary = id === primaryMeterId;
    const samples = isPrimary ? primarySamples : [];
    const liveWh = device.energy_wh ?? null;
    return {
      id,
      name: resolveWifiChannelDisplayName(id, device.name, overrides),
      host: device.host,
      model: device.model,
      live,
      today_kwh: isPrimary ? (todayUnreliable ? null : consumptionTodayKwh(samples, liveWh)) : null,
      daily: isPrimary ? computeDailyKwh(samples, 7, liveWh) : [],
      is_primary: isPrimary,
      counts_in_total: isPrimary,
    };
  });

  return NextResponse.json({
    hubOnline: isHubOnline(hub.last_seen_at),
    primary_meter_id: primaryMeterId,
    summary: {
      power_kw_total: liveKw,
      today_kwh: displayTodayKwh,
      week_kwh: weekKwh,
      month_kwh: monthKwh,
      today_kwh_reliable: !todayUnreliable,
    },
    moderation: computeModeration(todayKwh, expectedSoFar, new Date(), liveKw),
    trend: {
      daily: trendDaily,
      outdoor_temp: outdoorTemp,
      indoor_temp: indoorTemp,
    },
    statistics: {
      week: stats7,
      month: stats30,
    },
    cost: displayCost,
    insights,
    meters: metersForClient,
  });
}
