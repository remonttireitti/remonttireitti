import { createAdminClient } from "@/lib/supabase/admin";
import type { HubControlMode, HubState } from "@/lib/types";

export type MetricKind = "numeric" | "categorical";

export type MetricMeta = {
  label: string;
  unit?: string;
  kind: MetricKind;
};

export const METRIC_META: Record<string, MetricMeta> = {
  outdoor_temp_c: { label: "Ulkoilma T1", unit: "°C", kind: "numeric" },
  supply_temp_c: { label: "Tuloilma", unit: "°C", kind: "numeric" },
  exhaust_temp_c: { label: "Poistoilma T3", unit: "°C", kind: "numeric" },
  exhaust_hru_temp_c: { label: "Jäteilma T4", unit: "°C", kind: "numeric" },
  lto_temp_efficiency_pct: { label: "LTO lämpöhöytys", unit: "%", kind: "numeric" },
  lto_energy_efficiency_pct: { label: "LTO energiahöytys", unit: "%", kind: "numeric" },
  fan_supply_pct: { label: "Tulonopeus", unit: "%", kind: "numeric" },
  fan_exhaust_pct: { label: "Poistonopeus", unit: "%", kind: "numeric" },
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

export type MetricHistory = {
  metric: string;
  label: string;
  unit?: string;
  kind: MetricKind;
  points: MetricPoint[];
};

type SampleRow = {
  hub_id: string;
  metric: string;
  value: number | null;
  value_text: string | null;
};

const RETENTION_DAYS = 7;

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
  const supplyTemp = state.supply_room_temp_c ?? state.supply_hru_temp_c ?? null;
  const rows: SampleRow[] = [
    { hub_id: hubId, metric: "outdoor_temp_c", value: num(state.outdoor_temp_c), value_text: null },
    { hub_id: hubId, metric: "supply_temp_c", value: num(supplyTemp), value_text: null },
    { hub_id: hubId, metric: "exhaust_temp_c", value: num(state.exhaust_temp_c), value_text: null },
    { hub_id: hubId, metric: "exhaust_hru_temp_c", value: num(state.exhaust_hru_temp_c), value_text: null },
    { hub_id: hubId, metric: "lto_temp_efficiency_pct", value: num(state.lto_temp_efficiency_pct), value_text: null },
    { hub_id: hubId, metric: "lto_energy_efficiency_pct", value: num(state.lto_energy_efficiency_pct), value_text: null },
    { hub_id: hubId, metric: "fan_supply_pct", value: num(state.fan_supply_pct), value_text: null },
    { hub_id: hubId, metric: "fan_exhaust_pct", value: num(state.fan_exhaust_pct), value_text: null },
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
    .lt("recorded_at", cutoff);
}

export async function fetchMetricHistory(
  hubId: string,
  metric: string,
  hours = 24,
): Promise<MetricHistory | null> {
  const meta = METRIC_META[metric];
  if (!meta) return null;

  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hub_metric_samples")
    .select("value, value_text, recorded_at")
    .eq("hub_id", hubId)
    .eq("metric", metric)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(2000);

  if (error) {
    console.warn("[metrics] Haku epäonnistui:", error.message);
    return { metric, ...meta, points: [] };
  }

  const points: MetricPoint[] = (data ?? []).map((row) => ({
    t: String(row.recorded_at),
    v: row.value != null ? Number(row.value) : null,
    text: row.value_text != null ? String(row.value_text) : null,
  }));

  return { metric, ...meta, points };
}
