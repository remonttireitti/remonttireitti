import { mergeZwaveNodeOverrides } from "@/lib/device-item-overrides";
import { parseZwaveDeviceId } from "@/lib/device-protocol";
import type { HubLightDevice } from "@/lib/hub-lights";
import {
  zwaveNodeForDevice,
  zwaveNodeForParam,
  zwaveNodeId,
} from "@/lib/zwave-detail";
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
  if (stored.endpoints.length > 0) return stored;
  if (!fromDevices) return stored;
  return {
    ...stored,
    endpoints: fromDevices.endpoints,
  };
}

/** Resolve zwave/96 → device + node detail even when only zwave:96:e1 exists in hub state. */
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
  const siblings = zwaveSiblingsForNode(devices, nodeId);

  let device =
    devices.find((d) => d.id === fullId) ??
    (parsed.endpoint != null
      ? devices.find(
          (d) =>
            d.id === decoded ||
            d.id === `zwave:${nodeId}:e${parsed.endpoint}`,
        )
      : undefined);

  if (!device && siblings.length > 0) {
    device = groupHubDevicesToNodeDevice(nodeId, siblings);
  }

  if (!device) return null;

  const stored =
    zwaveNodeForDevice(fullId, hubState?.zwave_nodes) ??
    zwaveNodeForParam(param, hubState?.zwave_nodes);

  let zwaveNode = mergeNodeEndpoints(stored, siblings, nodeId);
  if (zwaveNode) {
    zwaveNode = mergeZwaveNodeOverrides(zwaveNode, hubState?.device_overrides);
  }

  return {
    fullId,
    nodeId,
    device,
    zwaveSiblings: siblings.length > 0 ? siblings : [device],
    zwaveNode,
  };
}
