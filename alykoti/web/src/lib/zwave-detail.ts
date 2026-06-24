import { parseZwaveDeviceId } from "@/lib/device-protocol";
import { resolveZwavePropertyLabel } from "@/lib/device-item-overrides";
import type { DeviceReading } from "@/lib/capabilities";
import type { HubState, ZwaveNodeDetail, ZwaveNodeEndpoint, ZwaveProperty } from "@/lib/types";
import { hasCapability, canWrite } from "@/lib/capabilities";

export function zwaveLockSetTopic(baseTopic: string, endpoint = 0): string {
  return `${baseTopic.replace(/\/$/, "")}/98/${endpoint}/targetValue`;
}

export function resolveZwaveLockSetTopic(
  hubState: HubState,
  deviceId: string,
  endpoint?: number | null,
): string | undefined {
  const raw = hubState.home_devices?.[deviceId];
  if (typeof raw?.lock_set_topic === "string" && raw.lock_set_topic.trim()) {
    return raw.lock_set_topic.trim();
  }

  const parsed = parseZwaveDeviceId(deviceId);
  if (!parsed) return undefined;

  const node = hubState.zwave_nodes?.[String(parsed.nodeId)];
  const epNum = endpoint ?? parsed.endpoint ?? 0;
  const ep =
    node?.endpoints.find((row) => row.device_id === deviceId) ??
    node?.endpoints.find((row) => row.endpoint === epNum);

  if (typeof ep?.lock_set_topic === "string" && ep.lock_set_topic.trim()) {
    return ep.lock_set_topic.trim();
  }

  const epRaw = ep?.device_id ? hubState.home_devices?.[ep.device_id] : undefined;
  if (typeof epRaw?.lock_set_topic === "string" && epRaw.lock_set_topic.trim()) {
    return epRaw.lock_set_topic.trim();
  }

  if (node?.base_topic) {
    return zwaveLockSetTopic(node.base_topic, epNum);
  }

  return undefined;
}

export function zwaveNodeId(nodeId: number): string {
  return `zwave:${nodeId}`;
}

export function zwaveNodeForDevice(
  deviceId: string,
  zwaveNodes: HubState["zwave_nodes"] | undefined,
): ZwaveNodeDetail | null {
  if (!zwaveNodes) return null;
  const parsed = parseZwaveDeviceId(deviceId);
  if (!parsed) return null;
  const node = zwaveNodes[String(parsed.nodeId)];
  return node ? normalizeZwaveNodeDetail(node) : null;
}

export function zwaveNodeForParam(
  param: string,
  zwaveNodes: HubState["zwave_nodes"] | undefined,
): ZwaveNodeDetail | null {
  if (!zwaveNodes) return null;
  const decoded = decodeURIComponent(param).trim();
  const parsed = parseZwaveDeviceId(decoded.includes(":") ? decoded : `zwave:${decoded}`);
  if (!parsed) return null;
  const node = zwaveNodes[String(parsed.nodeId)];
  return node ? normalizeZwaveNodeDetail(node) : null;
}

/** Varmista että endpoints/properties/config ovat taulukoita (vanha hub-state voi puuttua). */
export function normalizeZwaveNodeDetail(node: ZwaveNodeDetail): ZwaveNodeDetail {
  return {
    ...node,
    endpoints: Array.isArray(node.endpoints) ? node.endpoints : [],
    properties: Array.isArray(node.properties) ? node.properties : [],
    config: Array.isArray(node.config) ? node.config : [],
  };
}

function mergeReadingLabels(labels: Array<string | null | undefined>): string | null {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const label of labels) {
    if (!label) continue;
    for (const part of label.split(" · ")) {
      const trimmed = part.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        parts.push(trimmed);
      }
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function propertyKey(p: ZwaveProperty): string {
  return `${p.cc}:${p.endpoint}:${p.property ?? ""}`;
}

function mergeReadings(readingsLists: Array<DeviceReading[] | undefined>): DeviceReading[] {
  const out: DeviceReading[] = [];
  const seen = new Set<string>();
  for (const list of readingsLists) {
    if (!list?.length) continue;
    for (const r of list) {
      const key = `${r.label}:${r.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

/** One list row per Z-Wave node when multiple endpoints exist. */
export function groupZwaveDevicesForList<
  T extends {
    id: string;
    name: string;
    protocol: string;
    controllable: boolean;
    capabilitiesLabel?: string;
    readingLabel?: string | null;
    readings?: DeviceReading[];
    node_id?: number | null;
    endpoint?: number | null;
  },
>(devices: T[]): T[] {
  const zwaveByNode = new Map<number, T[]>();
  const rest: T[] = [];

  for (const device of devices) {
    if (device.protocol !== "zwave") {
      rest.push(device);
      continue;
    }
    const nodeId = device.node_id ?? parseZwaveDeviceId(device.id)?.nodeId;
    if (nodeId == null) {
      rest.push(device);
      continue;
    }
    const list = zwaveByNode.get(nodeId) ?? [];
    list.push(device);
    zwaveByNode.set(nodeId, list);
  }

  const grouped: T[] = [];
  for (const [nodeId, endpoints] of zwaveByNode) {
    if (endpoints.length <= 1) {
      grouped.push(endpoints[0]!);
      continue;
    }
    const sorted = [...endpoints].sort(
      (a, b) => (a.endpoint ?? 0) - (b.endpoint ?? 0),
    );
    const base = sorted[0]!;
    const baseName =
      base.name.replace(/\s*\([^)]+\)\s*$/i, "").trim() || base.name;
    const controllable = sorted.some((e) => e.controllable);
    const readings = mergeReadings(sorted.map((e) => e.readings));
    grouped.push({
      ...base,
      id: zwaveNodeId(nodeId),
      name: baseName,
      controllable,
      capabilitiesLabel: controllable ? `${sorted.length} kanavaa` : base.capabilitiesLabel,
      readingLabel: mergeReadingLabels(sorted.map((e) => e.readingLabel)),
      readings,
    });
  }

  return [...rest, ...grouped].sort((a, b) => a.name.localeCompare(b.name, "fi"));
}

function zwaveValueIsActive(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (v.includes("alarm") || v.includes("detected") || v.includes("active") || v.includes("motion")) {
      return true;
    }
    if (v.includes("idle") || v.includes("clear") || v.includes("inactive") || v.includes("no ")) {
      return false;
    }
    if (v === "true" || v === "on" || v === "open") return true;
    if (v === "false" || v === "off" || v === "closed") return false;
  }
  return false;
}

/** Compact reading for a single Z-Wave MQTT property value. */
export function formatZwavePropertyValue(
  value: unknown,
  prop?: Pick<ZwaveProperty, "cc" | "property">,
): string | null {
  if (value === null || value === undefined) return null;
  const p = (prop?.property ?? "").toLowerCase();

  if (prop?.cc === 49 && typeof value === "number" && Number.isFinite(value)) {
    if (p.includes("voltage")) return `${value.toFixed(1)} V`;
    if (p.includes("humidity")) return `${Math.round(value)} %`;
    if (p.includes("luminance") || p.includes("illuminance")) return `${Math.round(value)} lx`;
    if (p.includes("co2") || p.includes("carbon")) return `${Math.round(value)} ppm`;
    return `${value.toFixed(1)} °C`;
  }

  if (prop?.cc === 128 && typeof value === "number" && Number.isFinite(value)) {
    return `${Math.round(value)} %`;
  }

    if (prop?.cc === 48 || prop?.cc === 113) {
    const active = zwaveValueIsActive(value);
    if (p.includes("smoke") || p.includes("fire")) {
      return active ? "Hälytys" : "OK";
    }
    if (p.includes("water") || p.includes("leak") || p.includes("flood") || p.includes("moisture")) {
      return active ? "Vuoto" : "Kuiva";
    }
    if (p.includes("co") || p.includes("carbon")) {
      return active ? "Hälytys" : "OK";
    }
    if (p.includes("motion") || p.includes("intrusion") || p.includes("occupancy")) {
      return active ? "Liike" : "Ei liikettä";
    }
    if (p.includes("door") || p.includes("window") || p.includes("contact")) {
      return active ? "Avoin" : "Kiinni";
    }
    if (typeof value === "boolean") return value ? "Päällä" : "Pois";
    if (typeof value === "number") return value > 0 ? "Päällä" : "Pois";
    return formatZwaveValue(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  if (typeof value === "object" && value !== null) {
    return null;
  }

  return formatZwaveValue(value);
}

function zwavePropertyShouldSkip(prop: ZwaveProperty): boolean {
  const pName = (prop.property ?? "").toLowerCase();
  return /insidehandles|supporteddoorhandles|supportedmodes|doorstatuscomponent|bolt|latch|timeout/i.test(
    pName,
  );
}

function zwavePropertyFiLabel(prop: ZwaveProperty, resolvedLabel: string): string {
  const generic = /^(lämpöanturi|jännite in|tulo in|arvo|cc \d+|value|sensor)/i.test(resolvedLabel);
  if (!generic) return resolvedLabel;

  const p = (prop.property ?? "").toLowerCase();
  if (p.includes("smoke") || p.includes("fire")) return "Savu";
  if (p.includes("tamper") || p.includes("cover")) return "Peukalointi";
  if (p.includes("temperature") || (prop.cc === 49 && !p.includes("humidity") && !p.includes("voltage"))) {
    return "Lämpötila";
  }
  if (p.includes("humidity")) return "Kosteus";
  if (p.includes("luminance") || p.includes("illuminance")) return "Valoisuus";
  if (p.includes("motion") || p.includes("intrusion") || p.includes("occupancy")) return "Liike";
  if (p.includes("water") || p.includes("leak") || p.includes("flood") || p.includes("moisture")) {
    return "Vesivuoto";
  }
  if (p.includes("co") || p.includes("carbon")) return "CO";
  if (p.includes("door") || p.includes("window") || p.includes("contact")) return "Ovi/ikkuna";
  if (prop.cc === 128 || p.includes("battery")) return "Akku";
  if (p.includes("voltage")) return "Jännite";
  return resolvedLabel;
}

export function formatZwavePropertyReadings(
  properties: ZwaveProperty[] | undefined,
  nodeId: number,
  overrides?: HubState["device_overrides"],
): DeviceReading[] {
  if (!properties?.length) return [];
  const readings: DeviceReading[] = [];
  const seen = new Set<string>();
  for (const prop of properties) {
    if (zwavePropertyShouldSkip(prop)) continue;
    const val = formatZwavePropertyValue(prop.value, prop);
    if (!val || val === "—") continue;
    const key = propertyKey(prop);
    if (seen.has(key)) continue;
    seen.add(key);
    const resolved = resolveZwavePropertyLabel(nodeId, prop, overrides);
    readings.push({ label: zwavePropertyFiLabel(prop, resolved), value: val });
  }
  return readings;
}

export function formatZwavePropertiesReading(
  properties: ZwaveProperty[] | undefined,
  nodeId: number,
  overrides?: HubState["device_overrides"],
): string | null {
  const readings = formatZwavePropertyReadings(properties, nodeId, overrides);
  if (readings.length === 0) return null;
  return readings
    .map((r) => (/^(lämpöanturi|jännite in|tulo in|arvo|cc \d+)/i.test(r.label) ? r.value : `${r.label}: ${r.value}`))
    .join(" · ");
}

/** Flip a Z-Wave property value for binary toggles (bool or 0/1/99/255). */
export function toggleZwaveValue(value: unknown): boolean | number {
  if (typeof value === "boolean") return !value;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 0) return 255;
    if (value === 255 || value === 99 || value === 1) return 0;
    return value > 0 ? 0 : 255;
  }
  return value === true ? false : true;
}

export function formatZwaveValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Päällä" : "Pois";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (v === "true" || v === "on") return "Päällä";
    if (v === "false" || v === "off") return "Pois";
    if (v === "open") return "Avoin";
    if (v === "closed") return "Kiinni";
    return value.length > 48 ? `${value.slice(0, 45)}…` : value;
  }
  return JSON.stringify(value);
}

export function endpointShowsBinaryState(ep: ZwaveNodeEndpoint): boolean {
  const caps = ep.capabilities ?? [];
  return (
    ep.controllable === true ||
    hasCapability(caps, "switch") ||
    hasCapability(caps, "relay") ||
    hasCapability(caps, "fan") ||
    hasCapability(caps, "lock") ||
    hasCapability(caps, "contact") ||
    canWrite(caps, "switch") ||
    canWrite(caps, "lock")
  );
}

export function formatEndpointBinaryState(ep: ZwaveNodeEndpoint): string {
  const caps = ep.capabilities ?? [];
  if (hasCapability(caps, "lock") || ep.lock_set_topic) {
    return ep.on ? "Lukossa" : "Auki";
  }
  if (hasCapability(caps, "contact") && !ep.controllable) {
    return ep.on ? "Avoin" : "Kiinni";
  }
  return ep.on ? "Päällä" : "Pois";
}

export function configParamOptions(param: number): Array<{ label: string; value: number }> | null {
  // Common Fibaro / switch defaults for params 1–4
  const common: Record<number, Array<{ label: string; value: number }>> = {
    1: [
      { label: "Ei", value: 0 },
      { label: "Kyllä", value: 1 },
      { label: "Auto", value: 255 },
    ],
    2: [
      { label: "Ei", value: 0 },
      { label: "Kyllä", value: 1 },
    ],
    3: [
      { label: "Edellinen tila", value: 0 },
      { label: "Pois", value: 1 },
      { label: "Päällä", value: 2 },
    ],
    4: [
      { label: "Ei", value: 0 },
      { label: "Kyllä", value: 1 },
    ],
  };
  return common[param] ?? null;
}
