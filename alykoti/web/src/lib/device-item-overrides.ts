import type { HubDeviceOverride, HubState, ZwaveConfigParam, ZwaveNodeDetail, ZwaveProperty } from "@/lib/types";
import { zwaveNodeId } from "@/lib/zwave-detail";

export function zwaveEndpointItemKey(endpoint: number): string {
  return `ep:${endpoint}`;
}

export function zwavePropertyItemKey(p: Pick<ZwaveProperty, "cc" | "endpoint" | "property">): string {
  return `p:${p.cc}:${p.endpoint}:${p.property ?? ""}`;
}

export function zwaveConfigItemKey(param: number): string {
  return `cfg:${param}`;
}

export const READING_ITEM_KEYS = {
  temperature: "reading:temperature",
  humidity: "reading:humidity",
  battery: "reading:battery",
  co2: "reading:co2",
  illuminance: "reading:illuminance",
  sensor_state: "reading:sensor_state",
  power: "reading:power",
  locked: "reading:locked",
  switch: "reading:switch",
} as const;

export function resolveItemName(
  overrides: HubDeviceOverride | undefined,
  itemKey: string,
  defaultLabel: string,
): string {
  const custom = overrides?.item_names?.[itemKey]?.trim();
  return custom || defaultLabel;
}

export function resolveZwaveEndpointLabel(
  nodeId: number,
  endpoint: number,
  defaultLabel: string,
  overrides: HubState["device_overrides"] | undefined,
  deviceId?: string,
): string {
  const deviceOverride = deviceId ? overrides?.[deviceId] : undefined;
  if (deviceOverride?.display_name?.trim()) return deviceOverride.display_name.trim();
  const nodeOverride = overrides?.[zwaveNodeId(nodeId)];
  return resolveItemName(nodeOverride, zwaveEndpointItemKey(endpoint), defaultLabel);
}

export function resolveZwavePropertyLabel(
  nodeId: number,
  property: ZwaveProperty,
  overrides: HubState["device_overrides"] | undefined,
): string {
  const nodeOverride = overrides?.[zwaveNodeId(nodeId)];
  return resolveItemName(nodeOverride, zwavePropertyItemKey(property), property.label);
}

export function resolveZwaveConfigLabel(
  nodeId: number,
  param: ZwaveConfigParam,
  overrides: HubState["device_overrides"] | undefined,
): string {
  const nodeOverride = overrides?.[zwaveNodeId(nodeId)];
  return resolveItemName(nodeOverride, zwaveConfigItemKey(param.param), param.label);
}

export function mergeZwaveNodeOverrides(
  node: ZwaveNodeDetail,
  overrides: HubState["device_overrides"] | undefined,
): ZwaveNodeDetail {
  const nodeKey = zwaveNodeId(node.node_id);
  const nodeOverride = overrides?.[nodeKey];

  const mapProperty = (p: ZwaveProperty) => ({
    ...p,
    label: resolveZwavePropertyLabel(node.node_id, p, overrides),
  });

  return {
    ...node,
    name: nodeOverride?.display_name?.trim() || node.name,
    room: nodeOverride?.room ?? node.room,
    endpoints: node.endpoints.map((ep) => ({
      ...ep,
      label: resolveZwaveEndpointLabel(node.node_id, ep.endpoint, ep.label, overrides, ep.device_id),
      properties: ep.properties?.map(mapProperty),
    })),
    properties: node.properties.map(mapProperty),
    config: node.config.map((c) => ({
      ...c,
      label: resolveZwaveConfigLabel(node.node_id, c, overrides),
    })),
  };
}
