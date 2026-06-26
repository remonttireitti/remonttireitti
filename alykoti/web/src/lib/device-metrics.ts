import { collectDeviceReadings, type DeviceReading } from "@/lib/capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import { zwaveNodeId } from "@/lib/zwave-detail";
import type { MetricKind, MetricPoint, MetricRange } from "@/lib/metric-samples";
import { metricRangeBounds, type MetricHistory } from "@/lib/metric-samples";
import type { HubHomeDevice, HubState, ZwaveProperty } from "@/lib/types";
import { formatZwavePropertyReadings } from "@/lib/zwave-detail";

export const DEVICE_METRIC_PREFIX = "device:";

export type DeviceMetricFieldMeta = {
  label: string;
  unit?: string;
  kind: MetricKind;
};

const NUMERIC_FIELDS: Record<string, DeviceMetricFieldMeta> = {
  temperature_c: { label: "Lämpötila", unit: "°C", kind: "numeric" },
  humidity_pct: { label: "Kosteus", unit: "%", kind: "numeric" },
  battery_pct: { label: "Akku", unit: "%", kind: "numeric" },
  co2_ppm: { label: "CO₂", unit: "ppm", kind: "numeric" },
  illuminance_lux: { label: "Valoisuus", unit: "lx", kind: "numeric" },
  power_w: { label: "Teho", unit: "W", kind: "numeric" },
  voltage_v: { label: "Jännite", unit: "V", kind: "numeric" },
};

const READING_FIELD_BY_LABEL: Record<string, string> = {
  lämpötila: "reading:temperature",
  kosteus: "reading:humidity",
  akku: "reading:battery",
  co2: "reading:co2",
  valoisuus: "reading:illuminance",
  teho: "reading:power",
  lukko: "reading:locked",
  kytkin: "reading:switch",
  liike: "reading:motion",
  "ovi/ikkuna": "reading:contact",
  paikallaolo: "reading:occupancy",
  savu: "reading:smoke",
  vesivuoto: "reading:water_leak",
  tulo: "reading:input",
};

const NUMERIC_READING_FIELDS = new Set([
  "reading:temperature",
  "reading:humidity",
  "reading:battery",
  "reading:co2",
  "reading:illuminance",
  "reading:power",
]);

const READING_LABELS: Record<string, string> = {
  "reading:temperature": "Lämpötila",
  "reading:humidity": "Kosteus",
  "reading:battery": "Akku",
  "reading:co2": "CO₂",
  "reading:illuminance": "Valoisuus",
  "reading:power": "Teho",
  "reading:locked": "Lukko",
  "reading:switch": "Kytkin",
  "reading:motion": "Liike",
  "reading:contact": "Ovi/ikkuna",
  "reading:occupancy": "Paikallaolo",
  "reading:smoke": "Savu",
  "reading:water_leak": "Vesivuoto",
  "reading:input": "Tulo",
};

type ParsedDeviceMetric = {
  deviceId: string;
  field: string;
};

export function deviceMetricKey(deviceId: string, field: string): string {
  return `${DEVICE_METRIC_PREFIX}${deviceId}:${field}`;
}

export function metricFieldForZwaveProperty(
  prop: ZwaveProperty,
  nodeId: number,
  overrides?: HubState["device_overrides"],
): string | null {
  const readings = formatZwavePropertyReadings([prop], nodeId, overrides);
  if (readings.length === 0) return null;
  return fieldKeyFromReadingLabel(readings[0]!.label);
}

export function zwavePropertyDeviceMetricKey(
  nodeDeviceId: string,
  prop: ZwaveProperty,
  nodeId: number,
  overrides?: HubState["device_overrides"],
): string | null {
  const field = metricFieldForZwaveProperty(prop, nodeId, overrides);
  if (!field) return null;
  return deviceMetricKey(nodeDeviceId, field);
}

export function parseDeviceMetricKey(metric: string): ParsedDeviceMetric | null {
  if (!metric.startsWith(DEVICE_METRIC_PREFIX)) return null;
  const rest = metric.slice(DEVICE_METRIC_PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep <= 0) return null;
  return {
    deviceId: rest.slice(0, sep),
    field: rest.slice(sep + 1),
  };
}

export function isDeviceMetric(metric: string): boolean {
  return metric.startsWith(DEVICE_METRIC_PREFIX);
}

function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function fieldKeyFromReadingLabel(label: string): string {
  const norm = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/₂/g, "2");
  return READING_FIELD_BY_LABEL[norm] ?? `reading:${slugifyLabel(label)}`;
}

export function deviceMetricKeyForReading(deviceId: string, label: string): string {
  return deviceMetricKey(deviceId, fieldKeyFromReadingLabel(label));
}

function num(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

function parseReadingValue(value: string): { kind: MetricKind; v: number | null; text: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const tempMatch = /^(-?\d+(?:[.,]\d+)?)\s*°C$/i.exec(trimmed);
  if (tempMatch) {
    const n = Number.parseFloat(tempMatch[1]!.replace(",", "."));
    return Number.isFinite(n) ? { kind: "numeric", v: n, text: trimmed } : null;
  }

  const unitPatterns: Array<{ re: RegExp; kind: MetricKind }> = [
    { re: /^(-?\d+(?:[.,]\d+)?)\s*%$/, kind: "numeric" },
    { re: /^(-?\d+(?:[.,]\d+)?)\s*ppm$/i, kind: "numeric" },
    { re: /^(-?\d+(?:[.,]\d+)?)\s*lx$/i, kind: "numeric" },
    { re: /^(-?\d+(?:[.,]\d+)?)\s*W$/i, kind: "numeric" },
    { re: /^(-?\d+(?:[.,]\d+)?)\s*V$/i, kind: "numeric" },
  ];
  for (const { re, kind } of unitPatterns) {
    const m = re.exec(trimmed);
    if (m) {
      const n = Number.parseFloat(m[1]!.replace(",", "."));
      if (Number.isFinite(n)) return { kind, v: n, text: trimmed };
    }
  }

  const binary = categoricalBinary(trimmed);
  if (binary != null) {
    return { kind: "categorical", v: binary, text: trimmed };
  }

  return { kind: "categorical", v: null, text: trimmed };
}

function categoricalBinary(value: string): number | null {
  const v = value.toLowerCase();
  if (["avoin", "auki", "päällä", "liike", "hälytys", "vuoto", "peukaloitu", "paikalla"].includes(v)) {
    return 1;
  }
  if (["kiinni", "lukossa", "pois", "ei liikettä", "ok", "kuiva", "tyhjä"].includes(v)) {
    return 0;
  }
  return null;
}

type SampleRow = {
  hub_id: string;
  metric: string;
  value: number | null;
  value_text: string | null;
};

const DEVICE_METRIC_SAMPLE_INTERVAL_MS = 5 * 60_000;
const lastDeviceMetricSampleAt = new Map<string, number>();

function pushSample(
  rows: SampleRow[],
  hubId: string,
  deviceId: string,
  field: string,
  value: number | null,
  valueText: string | null,
) {
  if (value == null && !valueText) return;
  rows.push({
    hub_id: hubId,
    metric: deviceMetricKey(deviceId, field),
    value,
    value_text: valueText,
  });
}

function pushReadingSample(
  rows: SampleRow[],
  hubId: string,
  deviceId: string,
  reading: DeviceReading,
) {
  const parsed = parseReadingValue(reading.value);
  if (!parsed) return;
  pushSample(
    rows,
    hubId,
    deviceId,
    fieldKeyFromReadingLabel(reading.label),
    parsed.v,
    parsed.text,
  );
}

export function buildDeviceMetricSamples(
  hubId: string,
  homeDevices: Record<string, HubHomeDevice> | undefined,
  overrides?: HubState["device_overrides"],
  zwaveNodes?: HubState["zwave_nodes"],
): SampleRow[] {
  if (!homeDevices && !zwaveNodes) return [];
  const rows: SampleRow[] = [];

  for (const [deviceId, device] of Object.entries(homeDevices ?? {})) {
    const override = overrides?.[deviceId];

    for (const field of Object.keys(NUMERIC_FIELDS)) {
      const raw = device[field as keyof HubHomeDevice];
      const value = typeof raw === "number" ? num(raw) : null;
      if (value != null) {
        pushSample(rows, hubId, deviceId, field, value, null);
      }
    }

    if (device.on != null) {
      pushSample(
        rows,
        hubId,
        deviceId,
        "state:on",
        device.on ? 1 : 0,
        device.on ? "Päällä" : "Pois",
      );
    }
    if (device.locked != null) {
      pushSample(
        rows,
        hubId,
        deviceId,
        "state:locked",
        device.locked ? 1 : 0,
        device.locked ? "Lukossa" : "Auki",
      );
    }

    const nodeId =
      device.protocol === "zwave" && typeof device.node_id === "number" ? device.node_id : undefined;
    const readings = collectDeviceReadings(device, override?.item_names, nodeId, overrides);
    for (const reading of readings) {
      pushReadingSample(rows, hubId, deviceId, reading);
    }
  }

  if (zwaveNodes) {
    for (const [nodeKey, node] of Object.entries(zwaveNodes)) {
      const nodeId = Number(nodeKey);
      if (!Number.isFinite(nodeId)) continue;
      const deviceId = zwaveNodeId(nodeId);
      if (homeDevices?.[deviceId]) continue;
      const properties = node.properties ?? [];
      if (properties.length === 0) continue;

      const synthetic: HubHomeDevice = {
        protocol: "zwave",
        kind: "sensor",
        name: node.name ?? deviceId,
        capabilities: [],
        zwave_properties: properties,
        node_id: nodeId,
      };
      const nodeOverride = overrides?.[deviceId];
      const readings = collectDeviceReadings(
        synthetic,
        nodeOverride?.item_names,
        nodeId,
        overrides,
      );
      for (const reading of readings) {
        pushReadingSample(rows, hubId, deviceId, reading);
      }
    }
  }

  return rows;
}

export async function recordDeviceMetricSamples(
  hubId: string,
  homeDevices: Record<string, HubHomeDevice> | undefined,
  overrides?: HubState["device_overrides"],
  zwaveNodes?: HubState["zwave_nodes"],
): Promise<void> {
  const nowMs = Date.now();
  const last = lastDeviceMetricSampleAt.get(hubId) ?? 0;
  if (nowMs - last < DEVICE_METRIC_SAMPLE_INTERVAL_MS) return;
  lastDeviceMetricSampleAt.set(hubId, nowMs);

  const samples = buildDeviceMetricSamples(hubId, homeDevices, overrides, zwaveNodes);
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
    console.warn("[device-metrics] Tallennus epäonnistui:", error.message ?? String(error));
  }
}

function fieldMeta(
  field: string,
  deviceId: string,
  overrides?: HubState["device_overrides"],
): DeviceMetricFieldMeta {
  if (NUMERIC_FIELDS[field]) return NUMERIC_FIELDS[field]!;

  if (field.startsWith("reading:")) {
    const custom = overrides?.[deviceId]?.item_names?.[field]?.trim();
    const label = custom || READING_LABELS[field] || field.slice("reading:".length);
    const isNumeric = NUMERIC_READING_FIELDS.has(field);
    return {
      label,
      unit: field.includes("temperature")
        ? "°C"
        : field.includes("humidity") || field.includes("battery")
          ? "%"
          : field.includes("co2")
            ? "ppm"
            : field.includes("illuminance")
              ? "lx"
              : field.includes("power")
                ? "W"
                : undefined,
      kind: isNumeric ? "numeric" : "categorical",
    };
  }

  if (field === "state:on") return { label: "Tila", kind: "categorical" };
  if (field === "state:locked") return { label: "Lukko", kind: "categorical" };

  return { label: field, kind: "categorical" };
}

export function resolveDeviceMetricMeta(
  metric: string,
  homeDevices?: Record<string, HubHomeDevice>,
  overrides?: HubState["device_overrides"],
): { label: string; unit?: string; kind: MetricKind } | null {
  const parsed = parseDeviceMetricKey(metric);
  if (!parsed) return null;

  const device = homeDevices?.[parsed.deviceId];
  const deviceName = device?.name ?? parsed.deviceId;
  const meta = fieldMeta(parsed.field, parsed.deviceId, overrides);

  return {
    label: `${deviceName} — ${meta.label}`,
    unit: meta.unit,
    kind: meta.kind,
  };
}

function liveValueForDeviceField(
  device: HubHomeDevice | undefined,
  deviceId: string,
  field: string,
  overrides?: HubState["device_overrides"],
): { v: number | null; text: string | null } | null {
  if (!device) return null;

  if (field in NUMERIC_FIELDS) {
    const raw = device[field as keyof HubHomeDevice];
    const v = typeof raw === "number" ? num(raw) : null;
    return v != null ? { v, text: null } : null;
  }

  if (field === "state:on" && device.on != null) {
    return { v: device.on ? 1 : 0, text: device.on ? "Päällä" : "Pois" };
  }
  if (field === "state:locked" && device.locked != null) {
    return { v: device.locked ? 1 : 0, text: device.locked ? "Lukossa" : "Auki" };
  }

  if (field.startsWith("reading:")) {
    const nodeId =
      device.protocol === "zwave" && typeof device.node_id === "number" ? device.node_id : undefined;
    const readings = collectDeviceReadings(
      device,
      overrides?.[deviceId]?.item_names,
      nodeId,
      overrides,
    );
    for (const reading of readings) {
      if (fieldKeyFromReadingLabel(reading.label) !== field) continue;
      const parsed = parseReadingValue(reading.value);
      if (!parsed) return null;
      return { v: parsed.v, text: parsed.text };
    }
  }

  return null;
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
    console.warn("[device-metrics] Haku epäonnistui:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    t: String(row.recorded_at),
    v: row.value != null ? Number(row.value) : null,
    text: row.value_text != null ? String(row.value_text) : null,
  }));
}

function downsamplePoints(
  points: MetricPoint[],
  maxPoints: number,
  step = false,
): MetricPoint[] {
  const bucketSize = Math.ceil(points.length / maxPoints);
  const result: MetricPoint[] = [];
  for (let i = 0; i < points.length; i += bucketSize) {
    const slice = points.slice(i, i + bucketSize).filter((p) => p.v != null) as { t: string; v: number }[];
    if (slice.length === 0) continue;
    const pick = slice[slice.length - 1]!;
    const v = step ? pick.v : slice.reduce((s, p) => s + p.v, 0) / slice.length;
    result.push({ t: pick.t, v, text: null });
  }
  return result;
}

function extendPointsToNow(points: MetricPoint[], live: number | null): MetricPoint[] {
  if (live == null) return points;
  const now = new Date().toISOString();
  if (points.length === 0) return [{ t: now, v: live, text: null }];
  const last = points[points.length - 1]!;
  if (Date.now() - new Date(last.t).getTime() < 20_000 && last.v === live) {
    return [...points.slice(0, -1), { t: now, v: live, text: null }];
  }
  return [...points, { t: now, v: live, text: null }];
}

export async function fetchDeviceMetricHistory(
  hubId: string,
  metric: string,
  range: MetricRange,
  homeDevices?: Record<string, HubHomeDevice>,
  overrides?: HubState["device_overrides"],
): Promise<MetricHistory | null> {
  const parsed = parseDeviceMetricKey(metric);
  if (!parsed) return null;

  const meta = resolveDeviceMetricMeta(metric, homeDevices, overrides);
  if (!meta) return null;

  const { since, until, label: rangeLabel } = metricRangeBounds(range);
  const sinceIso = since.toISOString();
  const maxPoints = range === "day" ? 1500 : range === "week" ? 500 : 300;

  const primaryRaw = await fetchMetricPoints(hubId, metric, sinceIso);
  const useStepSample = meta.kind === "categorical";

  const device = homeDevices?.[parsed.deviceId];
  const live = liveValueForDeviceField(device, parsed.deviceId, parsed.field, overrides);
  const liveV = live?.v ?? null;

  let primaryPoints = downsamplePoints(
    primaryRaw.filter((p) => p.v != null || p.text != null),
    maxPoints,
    useStepSample,
  );

  if (meta.kind === "numeric") {
    primaryPoints = extendPointsToNow(
      primaryPoints.filter((p): p is MetricPoint & { v: number } => p.v != null),
      liveV,
    );
  } else if (live?.text) {
    primaryPoints = [...primaryPoints, { t: new Date().toISOString(), v: liveV, text: live.text }];
  }

  return {
    metric,
    label: meta.label,
    unit: meta.unit,
    kind: meta.kind,
    range,
    rangeStart: sinceIso,
    rangeEnd: until.toISOString(),
    rangeLabel,
    points: primaryPoints,
    currentValue: liveV,
    currentAt: live != null ? new Date().toISOString() : null,
  };
}
