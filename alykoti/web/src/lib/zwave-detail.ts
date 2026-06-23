import { parseZwaveDeviceId } from "@/lib/device-protocol";
import type { HubState, ZwaveNodeDetail, ZwaveNodeEndpoint } from "@/lib/types";
import { hasCapability, canWrite } from "@/lib/capabilities";

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
  return node ?? null;
}

export function zwaveNodeForParam(
  param: string,
  zwaveNodes: HubState["zwave_nodes"] | undefined,
): ZwaveNodeDetail | null {
  if (!zwaveNodes) return null;
  const decoded = decodeURIComponent(param).trim();
  const parsed = parseZwaveDeviceId(decoded.includes(":") ? decoded : `zwave:${decoded}`);
  if (!parsed) return null;
  return zwaveNodes[String(parsed.nodeId)] ?? null;
}

/** One list row per Z-Wave node when multiple endpoints exist. */
export function groupZwaveDevicesForList<
  T extends {
    id: string;
    name: string;
    protocol: string;
    controllable: boolean;
    capabilitiesLabel?: string;
    node_id?: number;
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
    grouped.push({
      ...base,
      id: zwaveNodeId(nodeId),
      name: baseName,
      controllable: sorted.some((e) => e.controllable),
      capabilitiesLabel: `${sorted.length} kanavaa`,
    });
  }

  return [...rest, ...grouped].sort((a, b) => a.name.localeCompare(b.name, "fi"));
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
    return value;
  }
  return JSON.stringify(value);
}

export function endpointShowsBinaryState(ep: ZwaveNodeEndpoint): boolean {
  const caps = ep.capabilities ?? [];
  return (
    ep.controllable === true ||
    hasCapability(caps, "switch") ||
    hasCapability(caps, "relay") ||
    hasCapability(caps, "contact") ||
    canWrite(caps, "switch")
  );
}

export function formatEndpointBinaryState(ep: ZwaveNodeEndpoint): string {
  const caps = ep.capabilities ?? [];
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
