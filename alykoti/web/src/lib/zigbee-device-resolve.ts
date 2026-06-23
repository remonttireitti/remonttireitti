import type { HubLightDevice } from "@/lib/hub-lights";
import type { HubState } from "@/lib/types";

export type ZigbeeDeviceContext = {
  fullId: string;
  device: HubLightDevice;
};

function zigbeeSuffix(id: string): string {
  return id.startsWith("zigbee:") ? id.slice("zigbee:".length) : id;
}

function nameMatches(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

/** Resolve zigbee/foo → device even when URL uses friendly name or override label. */
export function resolveZigbeeDeviceContext(
  param: string,
  devices: HubLightDevice[],
  hubState?: HubState,
): ZigbeeDeviceContext | null {
  const decoded = decodeURIComponent(param).trim();
  const fullId = decoded.includes(":") ? decoded : `zigbee:${decoded}`;
  const suffix = decoded.startsWith("zigbee:") ? decoded.slice("zigbee:".length) : decoded;
  const zigbeeDevices = devices.filter((d) => d.id.startsWith("zigbee:"));

  let device =
    zigbeeDevices.find((d) => d.id === decoded) ??
    zigbeeDevices.find((d) => d.id === fullId) ??
    zigbeeDevices.find((d) => zigbeeSuffix(d.id) === suffix) ??
    zigbeeDevices.find((d) => zigbeeSuffix(d.id) === decoded) ??
    zigbeeDevices.find((d) => nameMatches(d.name, decoded)) ??
    zigbeeDevices.find((d) => nameMatches(d.name, suffix));

  if (!device && hubState?.device_overrides) {
    const overrides = hubState.device_overrides;
    device = zigbeeDevices.find((d) => {
      const displayName = overrides[d.id]?.display_name?.trim();
      if (!displayName) return false;
      return nameMatches(displayName, decoded) || nameMatches(displayName, suffix);
    });
  }

  if (!device) return null;
  return { fullId: device.id, device };
}
