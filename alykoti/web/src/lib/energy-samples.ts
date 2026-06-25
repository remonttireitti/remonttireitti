import { createAdminClient } from "@/lib/supabase/admin";
import { hasCapability } from "@/lib/capabilities";
import type { HubHomeDevice } from "@/lib/types";

export const ENERGY_RETENTION_DAYS = 90;
const HELSINKI = "Europe/Helsinki";
const ENERGY_METRIC_PREFIX = "energy_wh:";
const ENERGY_PRUNE_INTERVAL_MS = 24 * 60 * 60_000;
const lastEnergyPruneAt = new Map<string, number>();

export type EnergySamplePoint = {
  t: string;
  wh: number;
};

export type DailyEnergy = {
  date: string;
  label: string;
  kwh: number | null;
};

export type DailyTemp = {
  date: string;
  avg_c: number | null;
};

export type ModerationLevel = "low" | "moderate" | "high" | "unknown";

export type EnergyModeration = {
  level: ModerationLevel;
  label: string;
  detail: string;
  today_vs_avg_pct: number | null;
};

export type EnergyInsight = {
  tone: "positive" | "warning" | "neutral";
  text: string;
};

export type EnergyStatistics = {
  range_days: number;
  period_kwh: number | null;
  prev_period_kwh: number | null;
  change_pct: number | null;
  avg_daily_kwh: number | null;
  max_daily_kwh: number | null;
  min_daily_kwh: number | null;
  days_above_avg: number;
  days_below_avg: number;
};

export function energyMetricKey(deviceId: string): string {
  return `${ENERGY_METRIC_PREFIX}${deviceId}`;
}

export function isEmMeter(id: string, device: HubHomeDevice): boolean {
  if (id.endsWith(":em")) return true;
  if (hasCapability(device.capabilities, "energy") || hasCapability(device.capabilities, "meter")) {
    return true;
  }
  if (device.protocol !== "shelly") return false;
  return (
    device.kind === "sensor" &&
    (device.energy_wh != null ||
      device.em_phases != null ||
      device.power_w != null ||
      device.power_kw != null)
  );
}

export function findEmMeters(
  home: Record<string, HubHomeDevice> | undefined,
): Array<{ id: string; device: HubHomeDevice }> {
  if (!home) return [];
  return Object.entries(home)
    .filter(([id, d]) => isEmMeter(id, d))
    .map(([id, device]) => ({ id, device }))
    .sort((a, b) => a.device.name.localeCompare(b.device.name, "fi"));
}

const EM_PHASE_KEYS = ["a", "b", "c"] as const;

export function isShellyEmId(id: string): boolean {
  return /^shelly:[^:]+:em$/.test(id);
}

/** Shelly EM jossa L1–L3 (a, b, c) -vaiheet. */
export function hasThreePhaseEm(device: HubHomeDevice): boolean {
  const phases = device.em_phases ?? {};
  return EM_PHASE_KEYS.every((k) => phases[k] != null);
}

/**
 * Päämittari kokonaiskulutukselle — yksi Shelly EM (L1+L2+L3).
 * Muut mittarit näytetään paneelissa, mutta eivät summautu (sisältyvät jo päämittariin).
 */
export function findPrimaryEmMeter(
  meters: Array<{ id: string; device: HubHomeDevice }>,
): string | null {
  if (meters.length === 0) return null;

  const envId = process.env.ENERGY_PRIMARY_METER_ID?.trim();
  if (envId && meters.some((m) => m.id === envId)) return envId;

  const threePhase = meters.filter((m) => isShellyEmId(m.id) && hasThreePhaseEm(m.device));
  if (threePhase.length > 0) return threePhase[0]!.id;

  const emOnly = meters.filter((m) => m.id.endsWith(":em"));
  if (emOnly.length > 0) return emOnly[0]!.id;

  return meters.length === 1 ? meters[0]!.id : null;
}

function num(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

export function helsinkiDateKey(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: HELSINKI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayLabel(dateKey: string): string {
  const today = helsinkiDateKey(new Date().toISOString());
  const yesterday = helsinkiDateKey(new Date(Date.now() - 86_400_000).toISOString());
  if (dateKey === today) return "Tänään";
  if (dateKey === yesterday) return "Eilen";
  const [y, m, day] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("fi-FI", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Kulutus kWh päivän Wh-laskurin deltoista (Europe/Helsinki). */
export function computeDailyKwh(
  samples: EnergySamplePoint[],
  days: number,
  liveWh?: number | null,
): DailyEnergy[] {
  const todayKey = helsinkiDateKey(new Date().toISOString());
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayKeys.push(helsinkiDateKey(d.toISOString()));
  }

  const byDay = new Map<string, { min: number; max: number }>();
  for (const key of dayKeys) {
    byDay.set(key, { min: Infinity, max: -Infinity });
  }

  for (const pt of samples) {
    const key = helsinkiDateKey(pt.t);
    if (!byDay.has(key)) continue;
    const row = byDay.get(key)!;
    row.min = Math.min(row.min, pt.wh);
    row.max = Math.max(row.max, pt.wh);
  }

  if (liveWh != null && Number.isFinite(liveWh) && byDay.has(todayKey)) {
    const row = byDay.get(todayKey)!;
    row.min = Math.min(row.min, liveWh);
    row.max = Math.max(row.max, liveWh);
  }

  return dayKeys.map((date) => {
    const row = byDay.get(date)!;
    if (!Number.isFinite(row.min) || !Number.isFinite(row.max)) {
      return { date, label: dayLabel(date), kwh: null };
    }
    const delta = row.max - row.min;
    const kwh = delta >= 0 ? delta / 1000 : null;
    return { date, label: dayLabel(date), kwh };
  });
}

export function consumptionTodayKwh(
  samples: EnergySamplePoint[],
  liveWh?: number | null,
): number | null {
  const daily = computeDailyKwh(samples, 1, liveWh);
  return daily[0]?.kwh ?? null;
}

export async function recordEnergySamples(
  hubId: string,
  homeDevices: Record<string, HubHomeDevice> | undefined,
): Promise<void> {
  const meters = findEmMeters(homeDevices);
  if (meters.length === 0) return;

  const payload = meters
    .map(({ id, device }) => {
      const wh = num(device.energy_wh);
      if (wh == null) return null;
      return {
        hub_id: hubId,
        metric: energyMetricKey(id),
        value: wh,
        value_text: null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  if (payload.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("hub_metric_samples").insert(payload);
  if (error) {
    console.warn("[energy] Tallennus epäonnistui:", error.message ?? String(error));
    return;
  }

  const lastPrune = lastEnergyPruneAt.get(hubId) ?? 0;
  const nowMs = Date.now();
  if (nowMs - lastPrune < ENERGY_PRUNE_INTERVAL_MS) return;

  lastEnergyPruneAt.set(hubId, nowMs);
  const cutoff = new Date(nowMs - ENERGY_RETENTION_DAYS * 86_400_000).toISOString();
  await supabase
    .from("hub_metric_samples")
    .delete()
    .eq("hub_id", hubId)
    .like("metric", `${ENERGY_METRIC_PREFIX}%`)
    .lt("recorded_at", cutoff);
}

export async function fetchEnergySamples(
  hubId: string,
  deviceId: string,
  since: Date,
): Promise<EnergySamplePoint[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hub_metric_samples")
    .select("value, recorded_at")
    .eq("hub_id", hubId)
    .eq("metric", energyMetricKey(deviceId))
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true })
    .limit(5000);

  if (error) {
    console.warn("[energy] Haku epäonnistui:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => ({
      t: String(row.recorded_at),
      wh: Number(row.value),
    }))
    .filter((pt) => Number.isFinite(pt.wh));
}

/** Yhdistä usean mittarin päivittäiset kWh-summat. */
export function aggregateDailyKwh(series: DailyEnergy[][]): DailyEnergy[] {
  const byDate = new Map<string, number | null>();

  for (const daily of series) {
    for (const row of daily) {
      const prev = byDate.get(row.date);
      if (row.kwh == null) {
        if (!byDate.has(row.date)) byDate.set(row.date, null);
        continue;
      }
      byDate.set(row.date, (prev ?? 0) + row.kwh);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, kwh]) => ({ date, label: dayLabel(date), kwh }));
}

export function sumKwhFromDaily(
  daily: DailyEnergy[],
  lastNDays?: number,
): number | null {
  const slice = lastNDays != null ? daily.slice(-lastNDays) : daily;
  const vals = slice.map((d) => d.kwh).filter((v): v is number => v != null && v >= 0);
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0);
}

function avgNullable(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function computeModeration(
  todayKwh: number | null,
  avgDailyKwh: number | null,
): EnergyModeration {
  if (todayKwh == null || avgDailyKwh == null || avgDailyKwh <= 0) {
    return {
      level: "unknown",
      label: "Ei vertailudataa",
      detail: "Kulutushistoriaa kertyy synkin myötä — arvio päivittyy muutaman päivän kuluttua.",
      today_vs_avg_pct: null,
    };
  }

  const ratio = todayKwh / avgDailyKwh;
  const vsPct = (ratio - 1) * 100;

  if (ratio <= 0.75) {
    return {
      level: "low",
      label: "Maltillinen",
      detail: `Tämän päivän kulutus on ${Math.abs(vsPct).toFixed(0)} % alle 30 pv keskiarvon.`,
      today_vs_avg_pct: vsPct,
    };
  }
  if (ratio >= 1.35) {
    return {
      level: "high",
      label: "Korkea",
      detail: `Tämän päivän kulutus on ${vsPct.toFixed(0)} % yli 30 pv keskiarvon.`,
      today_vs_avg_pct: vsPct,
    };
  }
  return {
    level: "moderate",
    label: "Normaali",
    detail: `Kulutus on lähellä 30 päivän keskiarvoa (${vsPct >= 0 ? "+" : ""}${vsPct.toFixed(0)} %).`,
    today_vs_avg_pct: vsPct,
  };
}

export function computeEnergyStatistics(
  daily: DailyEnergy[],
  rangeDays: number,
): EnergyStatistics {
  const complete = daily.filter((d) => d.kwh != null);
  const period = complete.slice(-rangeDays);
  const prev = complete.slice(-rangeDays * 2, -rangeDays);

  const periodVals = period.map((d) => d.kwh!);
  const prevVals = prev.map((d) => d.kwh!);
  const periodKwh = sumKwhFromDaily(period);
  const prevKwh = sumKwhFromDaily(prev);
  const avgDaily = avgNullable(periodVals);

  let above = 0;
  let below = 0;
  if (avgDaily != null) {
    for (const v of periodVals) {
      if (v > avgDaily * 1.05) above++;
      else if (v < avgDaily * 0.95) below++;
    }
  }

  return {
    range_days: rangeDays,
    period_kwh: periodKwh,
    prev_period_kwh: prevKwh,
    change_pct: pctChange(periodKwh, prevKwh),
    avg_daily_kwh: avgDaily,
    max_daily_kwh: periodVals.length ? Math.max(...periodVals) : null,
    min_daily_kwh: periodVals.length ? Math.min(...periodVals) : null,
    days_above_avg: above,
    days_below_avg: below,
  };
}

export function computeEnergyInsights(
  todayKwh: number | null,
  daily: DailyEnergy[],
  outdoor: DailyTemp[],
  indoor: DailyTemp[],
): EnergyInsight[] {
  const insights: EnergyInsight[] = [];
  const todayKey = helsinkiDateKey(new Date().toISOString());

  const pastDaily = daily.filter((d) => d.kwh != null && d.date !== todayKey);
  const recentKwh = pastDaily.slice(-7).map((d) => d.kwh!);
  const avgKwh = avgNullable(recentKwh);

  const outdoorPast = outdoor.filter((d) => d.avg_c != null && d.date !== todayKey);
  const recentOutdoor = outdoorPast.slice(-7).map((d) => d.avg_c!);
  const avgOutdoor = avgNullable(recentOutdoor);

  const todayOutdoor = outdoor.find((d) => d.date === todayKey)?.avg_c ?? null;
  const todayIndoor = indoor.find((d) => d.date === todayKey)?.avg_c ?? null;

  if (todayKwh != null && avgKwh != null && todayOutdoor != null && avgOutdoor != null) {
    const cooler = todayOutdoor < avgOutdoor - 1.5;
    const warmer = todayOutdoor > avgOutdoor + 1.5;
    const highUse = todayKwh > avgKwh * 1.12;
    const lowUse = todayKwh < avgKwh * 0.88;

    if (cooler && highUse) {
      insights.push({
        tone: "warning",
        text: "Päivä oli viileämpi kuin viikon keskiarvo, mutta sähkönkulutus nousi — tarkista lämmitys ja sähkölämmityksen ajastukset.",
      });
    } else if (warmer && lowUse) {
      insights.push({
        tone: "positive",
        text: "Lämpimämpi päivä ja kulutus pysyi alle keskiarvon — hyvä energiatehokkuus.",
      });
    } else if (cooler && lowUse) {
      insights.push({
        tone: "positive",
        text: "Viileämmästä säästä huolimatta kulutus pysyi maltillisena.",
      });
    } else if (warmer && highUse) {
      insights.push({
        tone: "warning",
        text: "Lämpimämpi päivä mutta kulutus korkeampi kuin tavallisesti — tarkista jäähdytys, IV-kone ja muut suuritehoiset laitteet.",
      });
    }
  }

  if (todayKwh != null && avgKwh != null) {
    const diffPct = ((todayKwh - avgKwh) / avgKwh) * 100;
    if (Math.abs(diffPct) >= 25) {
      insights.push({
        tone: diffPct > 0 ? "warning" : "positive",
        text:
          diffPct > 0
            ? `Tämän päivän kulutus on ${diffPct.toFixed(0)} % korkeampi kuin viimeisen viikon päiväkeskiarvo.`
            : `Tämän päivän kulutus on ${Math.abs(diffPct).toFixed(0)} % matalampi kuin viimeisen viikon päiväkeskiarvo.`,
      });
    }
  }

  if (todayOutdoor != null && todayIndoor != null) {
    const delta = todayIndoor - todayOutdoor;
    if (delta > 18) {
      insights.push({
        tone: "neutral",
        text: `Sisä- ja ulkolämpötilan ero on suuri (${delta.toFixed(1)} °C) — lämmityskuorma on odotetusti korkeampi.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      tone: "neutral",
      text: "Kulutus ja lämpötilat ovat tänään tavallisella tasolla. Data päivittyy synkin myötä.",
    });
  }

  return insights.slice(0, 3);
}

export function appendCostInsights(
  insights: EnergyInsight[],
  cost: {
    today_cost_eur: number | null;
    today_vs_yesterday_pct: number | null;
    week_cost_eur: number | null;
    week_vs_prev_pct: number | null;
    current_price_cents: number | null;
    today_kwh: number | null;
  },
): EnergyInsight[] {
  const out = [...insights];

  if (cost.today_cost_eur != null && cost.today_kwh != null) {
    const priceBit =
      cost.current_price_cents != null
        ? ` (spot nyt ${cost.current_price_cents.toFixed(1)} c/kWh)`
        : "";
    out.unshift({
      tone: "neutral",
      text: `Tämän päivän arvioitu sähkölasku ${cost.today_kwh.toFixed(1)} kWh:sta on noin ${cost.today_cost_eur.toFixed(2)} €${priceBit}.`,
    });
  }

  if (cost.today_vs_yesterday_pct != null && Math.abs(cost.today_vs_yesterday_pct) >= 8) {
    out.push({
      tone: cost.today_vs_yesterday_pct > 0 ? "warning" : "positive",
      text:
        cost.today_vs_yesterday_pct > 0
          ? `Päivän kustannus on ${cost.today_vs_yesterday_pct} % korkeampi kuin eilen (kulutus × spot-hinta).`
          : `Päivän kustannus on ${Math.abs(cost.today_vs_yesterday_pct)} % alempi kuin eilen.`,
    });
  }

  if (cost.week_cost_eur != null && cost.week_vs_prev_pct != null && Math.abs(cost.week_vs_prev_pct) >= 10) {
    out.push({
      tone: cost.week_vs_prev_pct > 0 ? "warning" : "positive",
      text:
        cost.week_vs_prev_pct > 0
          ? `Viikon arvioitu kustannus ${cost.week_cost_eur.toFixed(2)} € on ${cost.week_vs_prev_pct} % edellistä viikkoa korkeampi.`
          : `Viikon arvioitu kustannus ${cost.week_cost_eur.toFixed(2)} € on ${Math.abs(cost.week_vs_prev_pct)} % edellistä viikkoa alempi.`,
    });
  }

  return out.slice(0, 4);
}

export async function fetchDailyTempAverages(
  hubId: string,
  metric: string,
  since: Date,
): Promise<DailyTemp[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hub_metric_samples")
    .select("value, recorded_at")
    .eq("hub_id", hubId)
    .eq("metric", metric)
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true })
    .limit(5000);

  if (error) {
    console.warn("[energy] Lämpötilahaku epäonnistui:", error.message);
    return [];
  }

  const buckets = new Map<string, number[]>();
  for (const row of data ?? []) {
    const v = Number(row.value);
    if (!Number.isFinite(v)) continue;
    const key = helsinkiDateKey(String(row.recorded_at));
    const arr = buckets.get(key) ?? [];
    arr.push(v);
    buckets.set(key, arr);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      avg_c: avgNullable(vals),
    }));
}
