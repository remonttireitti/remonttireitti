import {
  formatCapabilitiesSummary,
  inferControllable,
  inferKindFromCapabilities,
  normalizeCapabilities,
  sensorReadingLabel,
} from "@/lib/capabilities";
import { inferProtocolFromId } from "@/lib/device-protocol";
import { anchorForLight } from "@/lib/lights-config";
import type { DeviceCapability, HubDeviceOverride, HubHomeDevice, HubLightState, HubState } from "@/lib/types";

export type HubLightDevice = {
  id: string;
  name: string;
  on: boolean;
  brightness: number | null;
  reachable: boolean;
  roomAnchorId: string | null;
  protocol: HubHomeDevice["protocol"];
  kind: HubHomeDevice["kind"];
  room: string | null;
  controllable: boolean;
  mqttSetTopic: string | null;
  lockSetTopic: string | null;
  locked: boolean | null;
  capabilities: DeviceCapability[];
  capabilitiesLabel: string;
  readingLabel: string | null;
  temperature_c: number | null;
  humidity_pct: number | null;
  co2_ppm: number | null;
  power_w: number | null;
};

const KIND_LABEL: Record<HubHomeDevice["kind"], string> = {
  light: "Valo",
  switch: "Kytkin",
  lock: "Lukko",
  fan: "Tuuletin",
  sensor: "Anturi",
  other: "Laite",
};

export function kindLabel(kind: HubHomeDevice["kind"]): string {
  return KIND_LABEL[kind] ?? "Laite";
}

function mapDevice(
  id: string,
  d: HubHomeDevice,
  o: HubDeviceOverride | undefined,
): HubLightDevice | null {
  if (o?.hidden) return null;

  const capabilities = normalizeCapabilities(d.capabilities);
  const kind = d.kind ?? (capabilities.length ? inferKindFromCapabilities(capabilities) : "other");
  const controllable =
    d.controllable === true || (d.controllable !== false && inferControllable(capabilities));
  const zigbeeName = id.startsWith("zigbee:") ? id.slice("zigbee:".length) : id;

  return {
    id,
    name: o?.display_name?.trim() || d.name?.trim() || id,
    on: d.on === true,
    brightness:
      typeof d.brightness === "number" && Number.isFinite(d.brightness) ? d.brightness : null,
    reachable: true,
    roomAnchorId: o?.floor_anchor ?? anchorForLight(zigbeeName) ?? null,
    protocol: inferProtocolFromId(id, d.protocol),
    kind,
    room: o?.room ?? d.room ?? null,
    controllable,
    mqttSetTopic: d.mqtt_set_topic ?? null,
    lockSetTopic: d.lock_set_topic ?? null,
    locked: d.locked ?? null,
    capabilities,
    capabilitiesLabel: formatCapabilitiesSummary(capabilities),
    readingLabel: sensorReadingLabel(d),
    temperature_c:
      typeof d.temperature_c === "number" && Number.isFinite(d.temperature_c) ? d.temperature_c : null,
    humidity_pct:
      typeof d.humidity_pct === "number" && Number.isFinite(d.humidity_pct) ? d.humidity_pct : null,
    co2_ppm: typeof d.co2_ppm === "number" && Number.isFinite(d.co2_ppm) ? d.co2_ppm : null,
    power_w: typeof d.power_w === "number" && Number.isFinite(d.power_w) ? d.power_w : null,
  };
}

export function parseHubHomeDevices(
  raw: HubState["home_devices"] | undefined,
  legacyLights?: HubState["lights"],
  overrides?: HubState["device_overrides"],
): HubLightDevice[] {
  if (raw && typeof raw === "object") {
    return Object.entries(raw)
      .map(([id, device]) => mapDevice(id, device as HubHomeDevice, overrides?.[id]))
      .filter((d): d is HubLightDevice => d != null);
  }

  return parseHubLights(legacyLights).map((light) => ({
    ...light,
    protocol: "zigbee" as const,
    kind: "light" as const,
    room: null,
    controllable: true,
    mqttSetTopic: null,
    lockSetTopic: null,
    locked: null,
    capabilities: [{ id: "switch", read: true, write: true }],
    capabilitiesLabel: "Kytkin",
    readingLabel: null,
    temperature_c: null,
    humidity_pct: null,
    co2_ppm: null,
    power_w: null,
  }));
}

export function parseHubLights(
  raw: HubState["lights"] | undefined,
): Omit<
  HubLightDevice,
  | "protocol"
  | "kind"
  | "room"
  | "controllable"
  | "mqttSetTopic"
  | "lockSetTopic"
  | "locked"
  | "capabilities"
  | "capabilitiesLabel"
  | "readingLabel"
  | "temperature_c"
  | "humidity_pct"
  | "co2_ppm"
  | "power_w"
>[] {
  if (!raw || typeof raw !== "object") return [];

  return Object.entries(raw).map(([id, state]) => {
    const light = state as HubLightState;
    const zigbeeName = id.startsWith("zigbee:") ? id.slice("zigbee:".length) : id;
    return {
      id,
      name: light.name?.trim() || id.replace(/^zigbee:/, ""),
      on: light.on === true,
      brightness:
        typeof light.brightness === "number" && Number.isFinite(light.brightness)
          ? light.brightness
          : null,
      reachable: true,
      roomAnchorId: anchorForLight(zigbeeName) ?? null,
    };
  });
}

export function groupDevices(devices: HubLightDevice[]) {
  const lights: HubLightDevice[] = [];
  const switches: HubLightDevice[] = [];
  const sensors: HubLightDevice[] = [];
  const locks: HubLightDevice[] = [];
  const other: HubLightDevice[] = [];

  for (const device of devices) {
    const ids = new Set(device.capabilities.map((c) => c.id));

    if (ids.has("lock") || device.kind === "lock") {
      locks.push(device);
    } else if (ids.has("button") || (device.kind === "switch" && !device.controllable)) {
      switches.push(device);
    } else if (ids.has("dimmer") || ids.has("color")) {
      lights.push(device);
    } else if (ids.has("switch") || ids.has("relay") || device.kind === "switch") {
      switches.push(device);
    } else if (device.kind === "light") {
      lights.push(device);
    } else if (
      ids.has("temperature") ||
      ids.has("humidity") ||
      ids.has("co2") ||
      ids.has("energy") ||
      ids.has("meter") ||
      ids.has("contact") ||
      ids.has("motion") ||
      ids.has("occupancy") ||
      ids.has("tvoc") ||
      ids.has("pm") ||
      device.kind === "sensor"
    ) {
      sensors.push(device);
    } else if (device.kind === "fan") {
      other.push(device);
    } else {
      other.push(device);
    }
  }

  return { lights, switches, sensors, locks, other };
}

export { formatCapabilitiesSummary, capabilityLabel } from "@/lib/capabilities";
