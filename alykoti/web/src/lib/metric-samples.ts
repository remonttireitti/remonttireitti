import { createAdminClient } from "@/lib/supabase/admin";
import type { HubControlMode, HubState } from "@/lib/types";

export type MetricKind = "numeric" | "categorical";

export type MetricMeta = {
  label: string;
  unit?: string;
  kind: MetricKind;
  footnote?: string;
};

export const METRIC_META: Record<string, MetricMeta> = {
  outdoor_temp_c: { label: "Ulkoilma T1", unit: "°C", kind: "numeric" },
  supply_temp_c: { label: "Tuloilma", unit: "°C", kind: "numeric" },
  exhaust_temp_c: { label: "Poistoilma T3", unit: "°C", kind: "numeric" },
  exhaust_hru_temp_c: { label: "Jäteilma T4", unit: "°C", kind: "numeric" },
  lto_temp_efficiency_pct: {
    label: "LTO lämpöhöytys",
    unit: "%",
    kind: "numeric",
    footnote:
      "Kuinka suuri osa poistoilman lämmöstä siirtyy tuloilmaan. Esim. +7,0 °C / 6,9 °C = 7 asteen lämpö talteen 6,9 asteen saatavilla olevasta erosta. 100 % = tulo yhtä lämmin kuin poisto (täysi LTO) — ei tarkoita että kaikki lämpö poistettaisiin talosta; jäteilma T4 näyttää mitä lähtee ulos.",
  },
  lto_energy_efficiency_pct: { label: "LTO energiahöytys", unit: "%", kind: "numeric" },
  fan_supply_pct: { label: "Tulonopeus", unit: "%", kind: "numeric" },
  fan_exhaust_pct: { label: "Poistonopeus", unit: "%", kind: "numeric" },
  fan_supply_target: { label: "Tulo pyydetty", unit: "%", kind: "numeric" },
  fan_exhaust_target: { label: "Poisto pyydetty", unit: "%", kind: "numeric" },
  co2_ppm: { label: "CO₂", unit: "ppm", kind: "numeric" },
  humidity_pct: { label: "Kosteus", unit: "%", kind: "numeric" },
  pm25_ugm3: { label: "PM2.5", unit: "µg/m³", kind: "numeric" },
  temperature_c: { label: "Huonelämpötila", unit: "°C", kind: "numeric" },
  hub_online: { label: "Hub-yhteys", kind: "categorical" },
  airfi_online: { label: "AirFi-yhteys", kind: "categorical" },
  control_mode: { label: "Toimintatila", kind: "categorical" },
  away_mode: { label: "Poissa-tila", kind: "categorical" },
  fireplace_active: { label: "Takkatila", kind: "categorical" },
  hood_active: { label: "Liesituuletin", kind: "categorical" },
};

export type MetricPoint = {
  t: string;
  v: number | null;
  text: string | null;
};

export type MetricRange = "day" | "week" | "month";

const HELSINKI = "Europe/Helsinki";

export type MetricSeries = {
  key: string;
  label: string;
  style: "primary" | "secondary";
  points: MetricPoint[];
};

export type MetricHistory = {
  metric: string;
  label: string;
  unit?: string;
  kind: MetricKind;
  footnote?: string;
  range: MetricRange;
  rangeStart: string;
  rangeEnd: string;
  rangeLabel: string;
  points: MetricPoint[];
  series?: MetricSeries[];
};

type SampleRow = {
  hub_id: string;
  metric: string;
  value: number | null;
  value_text: string | null;
};

const RETENTION_DAYS = 31;

/** Pyydetty nopeus näytetään toteutuneen rinnalla. */
const METRIC_COMPANIONS: Record<string, string> = {
  fan_supply_pct: "fan_supply_target",
  fan_exhaust_pct: "fan_exhaust_target",
};

function hoursSinceHelsinkiMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HELSINKI,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")!.value);
  const mi = Number(parts.find((p) => p.type === "minute")!.value);
  const s = Number(parts.find((p) => p.type === "second")!.value);
  return h + mi / 60 + s / 3600;
}

function formatRangeLabel(since: Date, until: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleString("fi-FI", {
      timeZone: HELSINKI,
      day: "numeric",
      month: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(since)} – ${fmt(until)}`;
}

export function metricRangeBounds(
  range: MetricRange,
  now = new Date(),
): { since: Date; until: Date; label: string } {
  const until = now;
  if (range === "day") {
    const since = new Date(now.getTime() - hoursSinceHelsinkiMidnight(now) * 3_600_000);
    return { since, until, label: formatRangeLabel(since, until) };
  }
  if (range === "week") {
    const since = new Date(now.getTime() - 7 * 24 * 3_600_000);
    return { since, until, label: formatRangeLabel(since, until) };
  }
  const since = new Date(now.getTime() - 30 * 24 * 3_600_000);
  return { since, until, label: formatRangeLabel(since, until) };
}

function downsamplePoints(points: MetricPoint[], maxPoints: number): MetricPoint[] {
  const bucketSize = Math.ceil(points.length / maxPoints);
  const result: MetricPoint[] = [];
  for (let i = 0; i < points.length; i += bucketSize) {
    const slice = points.slice(i, i + bucketSize).filter((p) => p.v != null) as { t: string; v: number }[];
    if (slice.length === 0) continue;
    const avg = slice.reduce((s, p) => s + p.v, 0) / slice.length;
    result.push({ t: slice[slice.length - 1]!.t, v: avg, text: null });
  }
  return result;
}

async function fetchMetricPoints(
  hubId: string,
  metric: string,
  since: string,
): Promise<MetricPoint[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hub_metric_samples")
    .select("value, value_text, recorded_at")
    .eq("hub_id", hubId)
    .eq("metric", metric)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(4000);

  if (error) {
    console.warn("[metrics] Haku epäonnistui:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    t: String(row.recorded_at),
    v: row.value != null ? Number(row.value) : null,
    text: row.value_text != null ? String(row.value_text) : null,
  }));
}

function num(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

export function buildMetricSamples(
  hubId: string,
  state: HubState,
  controlMode: HubControlMode,
  extras?: { hub_online?: boolean; airfi_online?: boolean },
): SampleRow[] {
  const supplyTemp = state.supply_room_temp_c ?? null;
  const rows: SampleRow[] = [
    { hub_id: hubId, metric: "outdoor_temp_c", value: num(state.outdoor_temp_c), value_text: null },
    { hub_id: hubId, metric: "supply_temp_c", value: num(supplyTemp), value_text: null },
    { hub_id: hubId, metric: "exhaust_temp_c", value: num(state.exhaust_temp_c), value_text: null },
    { hub_id: hubId, metric: "exhaust_hru_temp_c", value: num(state.exhaust_hru_temp_c), value_text: null },
    { hub_id: hubId, metric: "lto_temp_efficiency_pct", value: num(state.lto_temp_efficiency_pct), value_text: null },
    { hub_id: hubId, metric: "lto_energy_efficiency_pct", value: num(state.lto_energy_efficiency_pct), value_text: null },
    { hub_id: hubId, metric: "fan_supply_pct", value: num(state.fan_supply_pct), value_text: null },
    { hub_id: hubId, metric: "fan_exhaust_pct", value: num(state.fan_exhaust_pct), value_text: null },
    { hub_id: hubId, metric: "fan_supply_target", value: num(state.fan_supply_target), value_text: null },
    { hub_id: hubId, metric: "fan_exhaust_target", value: num(state.fan_exhaust_target), value_text: null },
    { hub_id: hubId, metric: "co2_ppm", value: num(state.co2_ppm), value_text: null },
    { hub_id: hubId, metric: "humidity_pct", value: num(state.humidity_pct), value_text: null },
    { hub_id: hubId, metric: "pm25_ugm3", value: num(state.pm25_ugm3), value_text: null },
    { hub_id: hubId, metric: "temperature_c", value: num(state.temperature_c), value_text: null },
    { hub_id: hubId, metric: "control_mode", value: null, value_text: controlMode },
    {
      hub_id: hubId,
      metric: "away_mode",
      value: state.away_mode ? 1 : 0,
      value_text: state.away_mode ? "Poissa" : "Kotona",
    },
    {
      hub_id: hubId,
      metric: "fireplace_active",
      value: state.fireplace_active ? 1 : 0,
      value_text: state.fireplace_active ? "Päällä" : "Pois",
    },
    {
      hub_id: hubId,
      metric: "hood_active",
      value: state.hood_active ? 1 : 0,
      value_text: state.hood_active ? "Auki" : "Kiinni",
    },
  ];

  if (extras?.hub_online != null) {
    rows.push({
      hub_id: hubId,
      metric: "hub_online",
      value: extras.hub_online ? 1 : 0,
      value_text: extras.hub_online ? "Online" : "Offline",
    });
  }
  if (extras?.airfi_online != null) {
    rows.push({
      hub_id: hubId,
      metric: "airfi_online",
      value: extras.airfi_online ? 1 : 0,
      value_text: extras.airfi_online ? "Online" : "Offline",
    });
  }

  return rows.filter((r) => r.value != null || r.value_text != null);
}

export async function recordHubMetrics(
  hubId: string,
  state: HubState,
  controlMode: HubControlMode,
  extras?: { hub_online?: boolean; airfi_online?: boolean },
): Promise<void> {
  const samples = buildMetricSamples(hubId, state, controlMode, extras);
  if (samples.length === 0) return;

  const payload = samples.map((row) => ({
    hub_id: row.hub_id,
    metric: row.metric,
    value: row.value,
    value_text: row.value_text,
  }));

  const supabase = createAdminClient();
  const { error } = await supabase.from("hub_metric_samples").insert(payload);
  if (error) {
    console.warn("[metrics] Tallennus epäonnistui:", error.message ?? String(error));
    return;
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  await supabase
    .from("hub_metric_samples")
    .delete()
    .eq("hub_id", hubId)
    .lt("recorded_at", cutoff)
    .not("metric", "like", "energy_wh:%");
}

export async function fetchMetricHistory(
  hubId: string,
  metric: string,
  range: MetricRange = "day",
): Promise<MetricHistory | null> {
  const meta = METRIC_META[metric];
  if (!meta) return null;

  const { since, until, label } = metricRangeBounds(range);
  const sinceIso = since.toISOString();
  const maxPoints = range === "day" ? 1500 : range === "week" ? 500 : 300;

  const primaryRaw = await fetchMetricPoints(hubId, metric, sinceIso);
  const primaryPoints = downsamplePoints(
    primaryRaw.filter((p) => p.v != null),
    maxPoints,
  );

  const companionKey = METRIC_COMPANIONS[metric];
  let series: MetricSeries[] | undefined;

  if (companionKey && METRIC_META[companionKey]) {
    const companionRaw = await fetchMetricPoints(hubId, companionKey, sinceIso);
    const companionPoints = downsamplePoints(
      companionRaw.filter((p) => p.v != null),
      maxPoints,
    );
    series = [
      { key: metric, label: "Toteutunut", style: "primary", points: primaryPoints },
      {
        key: companionKey,
        label: "Pyydetty",
        style: "secondary",
        points: companionPoints,
      },
    ];
  }

  return {
    metric,
    ...meta,
    range,
    rangeStart: sinceIso,
    rangeEnd: until.toISOString(),
    rangeLabel: label,
    points: primaryPoints,
    series,
  };
}
