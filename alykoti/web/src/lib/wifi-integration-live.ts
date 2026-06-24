import type { DeviceRole } from "@/lib/device-roles";
import {
  parseWifiChannelDeviceId,
  resolveWifiHostDisplayName,
  wifiHostOverrideKey,
} from "@/lib/device-item-overrides";
import { parseHubHomeDevices } from "@/lib/hub-lights";
import type { HubHomeDevice, HubState } from "@/lib/types";

function phasePowerW(
  device: HubHomeDevice | undefined,
  phase: "a" | "b" | "c",
): number | null {
  if (!device) return null;
  const fromPhases = device.em_phases?.[phase]?.power_w;
  if (fromPhases != null && Number.isFinite(fromPhases)) return fromPhases;
  if (phase === "a" && device.em_a_power_w != null && Number.isFinite(device.em_a_power_w)) {
    return device.em_a_power_w;
  }
  if (phase === "b" && device.em_b_power_w != null && Number.isFinite(device.em_b_power_w)) {
    return device.em_b_power_w;
  }
  return null;
}

export type WifiIntegrationChannelLive = {
  id: string;
  name: string;
  kind: string;
  channel: number;
  role: DeviceRole;
  inferredRole: DeviceRole;
  roleOverride: DeviceRole | null;
  room: string | null;
  on: boolean;
  controllable: boolean;
  power_w?: number | null;
  energy_wh?: number | null;
  em_a_power_w?: number | null;
  em_b_power_w?: number | null;
};

export type WifiIntegrationHostLive = {
  id: string;
  hostOverrideKey: string;
  name: string;
  host: string;
  model?: string;
  room: string | null;
  channels: WifiIntegrationChannelLive[];
  reachable: boolean;
  configured?: boolean;
  awaitingSync?: boolean;
};

export function channelsForWifiHost(
  protocol: "shelly" | "tasmota",
  host: string,
  home: Record<string, HubHomeDevice> | undefined,
  overrides: HubState["device_overrides"] | undefined,
): WifiIntegrationChannelLive[] {
  const prefix = `${protocol}:${host}:`;
  const subset = Object.fromEntries(
    Object.entries(home ?? {}).filter(([id]) => id.startsWith(prefix)),
  );
  return parseHubHomeDevices(subset, undefined, overrides)
    .map((d) => {
      const parsed = parseWifiChannelDeviceId(d.id);
      const raw = home?.[d.id] as HubHomeDevice | undefined;
      return {
        id: d.id,
        name: d.name,
        kind: d.kind,
        channel: parsed?.channel ?? 0,
        role: d.role,
        inferredRole: d.inferredRole,
        roleOverride: d.roleOverride,
        room: d.room,
        on: d.on,
        controllable: d.controllable,
        power_w: raw?.power_w,
        energy_wh: raw?.energy_wh,
        em_a_power_w: phasePowerW(raw, "a"),
        em_b_power_w: phasePowerW(raw, "b"),
      };
    })
    .sort((a, b) => a.channel - b.channel);
}

export function buildWifiHostLive(
  protocol: "shelly" | "tasmota",
  dev: { id: string; host: string; name: string; model?: string },
  home: Record<string, HubHomeDevice> | undefined,
  overrides: HubState["device_overrides"] | undefined,
  extra?: Partial<Pick<WifiIntegrationHostLive, "configured" | "awaitingSync">>,
): WifiIntegrationHostLive {
  const hostOverrideKey = wifiHostOverrideKey(protocol, dev.host);
  const hostOverride = overrides?.[hostOverrideKey];
  const channels = channelsForWifiHost(protocol, dev.host, home, overrides);
  return {
    id: dev.id,
    hostOverrideKey,
    name: resolveWifiHostDisplayName(protocol, dev.host, dev.name, overrides),
    host: dev.host,
    model: dev.model,
    room: hostOverride?.room ?? null,
    channels,
    reachable: channels.length > 0,
    ...extra,
  };
}
