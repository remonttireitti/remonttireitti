import { hubDeviceEventsToLive } from "@/lib/device-events";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import { parseHubHomeDevices, prepareDevicesForList, type HubLightDevice } from "@/lib/hub-lights";
import { resolveZwaveDeviceContext } from "@/lib/zwave-device-resolve";
import type { Hub, HubState, ZwaveNodeDetail } from "@/lib/types";
import type { DeviceLiveEvent } from "@/lib/device-events";

export type ZwaveDeviceDetailPayload = {
  device: HubLightDevice;
  zwaveNode: ZwaveNodeDetail | null;
  zwaveSiblings: HubLightDevice[];
  itemNames: Record<string, string>;
  hubOnline: boolean;
  recentEvents: DeviceLiveEvent[];
};

export function loadZwaveDeviceDetail(
  hub: Hub,
  param: string,
): ZwaveDeviceDetailPayload | null {
  const hubState = hub.state as HubState | undefined;
  const homeDevices = normalizeHomeDevices(hubState?.home_devices, {
    integrations: hubState?.integrations,
    airthingsState: hubState,
  });
  const devices = prepareDevicesForList(
    parseHubHomeDevices(homeDevices, hubState?.lights, hubState?.device_overrides, {
      includeHidden: true,
    }),
    homeDevices,
    hubState?.zwave_nodes,
    hubState?.device_overrides,
  );

  const ctx = resolveZwaveDeviceContext(param, devices, hubState);
  if (!ctx) return null;

  return {
    device: ctx.device,
    zwaveNode: ctx.zwaveNode,
    zwaveSiblings: ctx.zwaveSiblings,
    itemNames: hubState?.device_overrides?.[ctx.fullId]?.item_names ?? {},
    hubOnline: hub.last_seen_at != null,
    recentEvents: hubDeviceEventsToLive(hubState?.device_live_events, ctx.fullId),
  };
}
