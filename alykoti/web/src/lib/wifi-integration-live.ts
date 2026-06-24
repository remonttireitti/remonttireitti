import type { DeviceRole } from "@/lib/device-roles";
import {
  parseWifiChannelDeviceId,
  parseWifiEmDeviceId,
  resolveWifiHostDisplayName,
  wifiHostOverrideKey,
} from "@/lib/device-item-overrides";
import { parseHubHomeDevices } from "@/lib/hub-lights";
import type { EnergyPhases, HubHomeDevice, HubState } from "@/lib/types";

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
  isEm?: boolean;
  role: DeviceRole;
  inferredRole: DeviceRole;
  roleOverride: DeviceRole | null;
  room: string | null;
  on: boolean;
  controllable: boolean;
  power_w?: number | null;
  power_kw?: number | null;
  energy_wh?: number | null;
  em_phases?: EnergyPhases;
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
      const em = parseWifiEmDeviceId(d.id);
      const parsed = parseWifiChannelDeviceId(d.id);
      const raw = home?.[d.id] as HubHomeDevice | undefined;
      return {
        id: d.id,
        name: d.name,
        kind: d.kind,
        channel: em ? 99 : (parsed?.channel ?? 0),
        isEm: !!em,
        role: d.role,
        inferredRole: d.inferredRole,
        roleOverride: d.roleOverride,
        room: d.room,
        on: d.on,
        controllable: d.controllable,
        power_w: raw?.power_w,
        power_kw: raw?.power_kw ?? null,
        energy_wh: raw?.energy_wh,
        em_phases: raw?.em_phases,
        em_a_power_w: phasePowerW(raw, "a"),
        em_b_power_w: phasePowerW(raw, "b"),
      };
    })
    .sort((a, b) => {
      if (a.isEm && !b.isEm) return 1;
      if (!a.isEm && b.isEm) return -1;
      return a.channel - b.channel;
    });
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
