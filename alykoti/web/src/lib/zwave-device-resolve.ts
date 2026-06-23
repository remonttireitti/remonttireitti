import { formatCapabilitiesSummary, inferControllable, inferKindFromCapabilities, normalizeCapabilities } from "@/lib/capabilities";
import { mergeZwaveNodeOverrides } from "@/lib/device-item-overrides";
import { parseZwaveDeviceId } from "@/lib/device-protocol";
import { hubLightDevicesForZwaveNode, type HubLightDevice } from "@/lib/hub-lights";
import {
  normalizeZwaveNodeDetail,
  zwaveNodeForDevice,
  zwaveNodeForParam,
  zwaveNodeId,
} from "@/lib/zwave-detail";
import type { DeviceRole } from "@/lib/device-roles";
import type { HubState, ZwaveNodeDetail, ZwaveNodeEndpoint } from "@/lib/types";

export type ZwaveDeviceContext = {
  fullId: string;
  nodeId: number;
  device: HubLightDevice;
  zwaveSiblings: HubLightDevice[];
  zwaveNode: ZwaveNodeDetail | null;
};

export function zwaveSiblingsForNode(
  devices: HubLightDevice[],
  nodeId: number,
): HubLightDevice[] {
  return devices.filter((d) => parseZwaveDeviceId(d.id)?.nodeId === nodeId);
}

function endpointLabelFromName(name: string): string {
  const m = name.match(/\(([^)]+)\)\s*$/);
  return m?.[1]?.trim() || name;
}

export function hubDeviceToZwaveEndpoint(d: HubLightDevice): ZwaveNodeEndpoint {
  const ep = d.endpoint ?? parseZwaveDeviceId(d.id)?.endpoint ?? 0;
  return {
    endpoint: ep,
    device_id: d.id,
    label: endpointLabelFromName(d.name),
    on: d.on,
    brightness: d.brightness,
    controllable: d.controllable,
    mqtt_set_topic: d.mqttSetTopic,
    capabilities: d.capabilities,
  };
}

function hubLightFromZwaveEndpoint(
  node: ZwaveNodeDetail,
  ep: ZwaveNodeEndpoint,
  hubState?: HubState,
): HubLightDevice {
  const deviceId = ep.device_id || `zwave:${node.node_id}:e${ep.endpoint}`;
  const override =
    hubState?.device_overrides?.[deviceId] ?? hubState?.device_overrides?.[zwaveNodeId(node.node_id)];
  const capabilities = normalizeCapabilities(ep.capabilities);
  const kind = capabilities.length ? inferKindFromCapabilities(capabilities) : "other";
  const controllable =
    ep.controllable === true || (ep.controllable !== false && inferControllable(capabilities));

  return {
    id: deviceId,
    name: override?.display_name?.trim() || ep.label || node.name,
    on: ep.on === true,
    brightness:
      typeof ep.brightness === "number" && Number.isFinite(ep.brightness) ? ep.brightness : null,
    reachable: true,
    roomAnchorId: override?.floor_anchor ?? null,
    protocol: "zwave",
    kind,
    room: override?.room ?? node.room ?? null,
    controllable,
    mqttSetTopic: ep.mqtt_set_topic ?? null,
    lockSetTopic: null,
    locked: null,
    capabilities,
    capabilitiesLabel: formatCapabilitiesSummary(capabilities),
    readingLabel: null,
    temperature_c: null,
    humidity_pct: null,
    co2_ppm: null,
    illuminance_lux: null,
    sensor_state: null,
    endpoint: ep.endpoint,
    node_id: node.node_id,
    power_w: null,
    model: null,
    manufacturer: null,
    description: null,
    battery_pct: null,
    voltage_v: null,
    role: "other_control" as DeviceRole,
  };
}

function siblingsFromZwaveNode(node: ZwaveNodeDetail, hubState?: HubState): HubLightDevice[] {
  return normalizeZwaveNodeDetail(node).endpoints.map((ep) =>
    hubLightFromZwaveEndpoint(node, ep, hubState),
  );
}

export function groupHubDevicesToNodeDevice(
  nodeId: number,
  siblings: HubLightDevice[],
): HubLightDevice {
  const sorted = [...siblings].sort((a, b) => (a.endpoint ?? 0) - (b.endpoint ?? 0));
  const base = sorted[0]!;
  const baseName = base.name.replace(/\s*\([^)]+\)\s*$/i, "").trim() || base.name;
  const readingParts = sorted
    .map((e) => e.readingLabel)
    .filter((x): x is string => typeof x === "string" && x.length > 0);
  const readingLabel =
    readingParts.length > 0 ? [...new Set(readingParts)].join(" · ") : base.readingLabel;

  return {
    ...base,
    id: zwaveNodeId(nodeId),
    name: baseName,
    controllable: sorted.some((e) => e.controllable),
    capabilitiesLabel:
      sorted.length > 1 ? `${sorted.length} kanavaa` : base.capabilitiesLabel,
    readingLabel,
    node_id: nodeId,
  };
}

export function zwaveNodeFromHubDevices(
  nodeId: number,
  siblings: HubLightDevice[],
): ZwaveNodeDetail | null {
  if (siblings.length === 0) return null;
  const sorted = [...siblings].sort((a, b) => (a.endpoint ?? 0) - (b.endpoint ?? 0));
  const base = sorted[0]!;
  return {
    node_id: nodeId,
    name: base.name.replace(/\s*\([^)]+\)\s*$/i, "").trim() || base.name,
    room: base.room,
    endpoints: sorted.map(hubDeviceToZwaveEndpoint),
    config: [],
    properties: [],
  };
}

function mergeNodeEndpoints(
  stored: ZwaveNodeDetail | null,
  siblings: HubLightDevice[],
  nodeId: number,
): ZwaveNodeDetail | null {
  const fromDevices = zwaveNodeFromHubDevices(nodeId, siblings);
  if (!stored) return fromDevices;
  const normalized = normalizeZwaveNodeDetail(stored);
  if (normalized.endpoints.length > 0) return normalized;
  if (!fromDevices) return normalized;
  return {
    ...normalized,
    endpoints: fromDevices.endpoints,
  };
}

function buildStubZwaveDevice(
  nodeId: number,
  fullId: string,
  storedNode: ZwaveNodeDetail,
): HubLightDevice {
  return {
    id: fullId,
    name: storedNode.name !== `Node ${nodeId}` ? storedNode.name : `Z-Wave ${nodeId}`,
    on: false,
    brightness: null,
    reachable: true,
    roomAnchorId: null,
    protocol: "zwave",
    kind: "other",
    room: storedNode.room ?? null,
    controllable: storedNode.endpoints.some((ep) => ep.controllable),
    mqttSetTopic: null,
    lockSetTopic: null,
    locked: null,
    capabilities: [],
    capabilitiesLabel: "Z-Wave",
    readingLabel: null,
    temperature_c: null,
    humidity_pct: null,
    co2_ppm: null,
    illuminance_lux: null,
    sensor_state: null,
    endpoint: null,
    node_id: nodeId,
    power_w: null,
    model: null,
    manufacturer: null,
    description: null,
    battery_pct: null,
    voltage_v: null,
    role: "other_control",
  };
}

/** Resolve zwave/77 → device + node detail even when only zwave:77:e1 or zwave_nodes exists. */
export function resolveZwaveDeviceContext(
  param: string,
  devices: HubLightDevice[],
  hubState: HubState | undefined,
): ZwaveDeviceContext | null {
  const decoded = decodeURIComponent(param).trim();
  const parsed = parseZwaveDeviceId(
    decoded.includes(":") ? decoded : `zwave:${decoded}`,
  );
  if (!parsed) return null;

  const nodeId = parsed.nodeId;
  const fullId = zwaveNodeId(nodeId);
  let siblings = zwaveSiblingsForNode(devices, nodeId);
  if (siblings.length === 0) {
    siblings = hubLightDevicesForZwaveNode(hubState, nodeId);
  }

  let device =
    devices.find((d) => d.id === fullId) ??
    (parsed.endpoint != null
      ? devices.find(
          (d) =>
            d.id === decoded ||
            d.id === `zwave:${nodeId}:e${parsed.endpoint}`,
        )
      : undefined);

  const storedNode = normalizeZwaveNodeDetail(
    zwaveNodeForDevice(fullId, hubState?.zwave_nodes) ??
      zwaveNodeForParam(param, hubState?.zwave_nodes) ??
      { node_id: nodeId, name: `Node ${nodeId}`, endpoints: [], config: [], properties: [] },
  );

  if (siblings.length === 0 && storedNode.endpoints.length > 0) {
    siblings = siblingsFromZwaveNode(storedNode, hubState);
  }

  if (!device && siblings.length > 0) {
    device = groupHubDevicesToNodeDevice(nodeId, siblings);
  }

  if (!device && storedNode.endpoints.length > 0) {
    siblings = siblingsFromZwaveNode(storedNode, hubState);
    device = groupHubDevicesToNodeDevice(nodeId, siblings);
  }

  if (!device && storedNode.name && storedNode.name !== `Node ${nodeId}`) {
    device = buildStubZwaveDevice(nodeId, fullId, storedNode);
  }

  const hasHubTrace =
    Boolean(hubState?.zwave_nodes?.[String(nodeId)]) ||
    hubLightDevicesForZwaveNode(hubState, nodeId).length > 0 ||
    siblings.length > 0;

  if (!device && hasHubTrace) {
    device = buildStubZwaveDevice(nodeId, fullId, storedNode);
  }

  if (!device) return null;

  let zwaveNode = mergeNodeEndpoints(storedNode, siblings, nodeId);
  if (zwaveNode) {
    zwaveNode = mergeZwaveNodeOverrides(zwaveNode, hubState?.device_overrides);
    zwaveNode = normalizeZwaveNodeDetail(zwaveNode);
  }

  return {
    fullId,
    nodeId,
    device,
    zwaveSiblings: siblings.length > 0 ? siblings : [device],
    zwaveNode,
  };
}
