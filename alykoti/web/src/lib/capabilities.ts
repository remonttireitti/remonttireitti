import type { DeviceCapability, DeviceCapabilityId, HubHomeDevice } from "@/lib/types";

export const CAPABILITY_LABELS: Record<DeviceCapabilityId, string> = {
  switch: "Kytkin",
  dimmer: "Himmennys",
  color: "Väri",
  lock: "Lukko",
  temperature: "Lämpötila",
  humidity: "Kosteus",
  co2: "CO₂",
  energy: "Energia",
  meter: "Mittari",
  relay: "Rele",
  contact: "Ovi/ikkuna",
  motion: "Liike",
  occupancy: "Paikallaolo",
  battery: "Akku",
  fan: "Tuuletin",
  cover: "Verho",
  button: "Painike",
  tvoc: "TVOC",
  pm: "Hiukkaset",
};

const CONTROL_CAPABILITIES: DeviceCapabilityId[] = ["switch", "dimmer", "lock", "relay", "fan", "cover"];

export function capabilityLabel(id: DeviceCapabilityId): string {
  return CAPABILITY_LABELS[id] ?? id;
}

export function formatCapabilitiesSummary(caps: DeviceCapability[] | undefined): string {
  const normalized = normalizeCapabilities(caps);
  if (normalized.length === 0) return "—";
  return normalized.map((c) => capabilityLabel(c.id)).join(", ");
}

export function normalizeCapabilities(
  raw: DeviceCapability[] | string[] | undefined,
): DeviceCapability[] {
  if (!raw?.length) return [];

  const map = new Map<DeviceCapabilityId, DeviceCapability>();

  for (const item of raw) {
    if (typeof item === "string") {
      const id = item as DeviceCapabilityId;
      if (!map.has(id)) {
        map.set(id, { id, read: true, write: CONTROL_CAPABILITIES.includes(id) });
      }
      continue;
    }
    if (!item || typeof item !== "object" || !item.id) continue;
    const id = item.id as DeviceCapabilityId;
    const prev = map.get(id);
    map.set(id, {
      id,
      read: prev?.read === true || item.read !== false,
      write: prev?.write === true || item.write === true,
    });
  }

  return [...map.values()].sort((a, b) => capabilityLabel(a.id).localeCompare(capabilityLabel(b.id), "fi"));
}

export function hasCapability(
  caps: DeviceCapability[] | undefined,
  id: DeviceCapabilityId,
): boolean {
  return normalizeCapabilities(caps).some((c) => c.id === id);
}

export function canRead(caps: DeviceCapability[] | undefined, id: DeviceCapabilityId): boolean {
  return normalizeCapabilities(caps).some((c) => c.id === id && c.read);
}

export function canWrite(caps: DeviceCapability[] | undefined, id: DeviceCapabilityId): boolean {
  return normalizeCapabilities(caps).some((c) => c.id === id && c.write);
}

export function inferKindFromCapabilities(caps: DeviceCapability[]): HubHomeDevice["kind"] {
  const ids = new Set(caps.map((c) => c.id));
  if (ids.has("lock")) return "lock";
  if (ids.has("color") || ids.has("dimmer")) return "light";
  if (ids.has("switch") || ids.has("relay")) return "switch";
  if (ids.has("fan")) return "fan";
  if (
    ids.has("temperature") ||
    ids.has("humidity") ||
    ids.has("co2") ||
    ids.has("energy") ||
    ids.has("meter") ||
    ids.has("contact") ||
    ids.has("motion") ||
    ids.has("occupancy") ||
    ids.has("tvoc") ||
    ids.has("pm")
  ) {
    return "sensor";
  }
  if (ids.has("button")) return "switch";
  return "other";
}

export function inferControllable(caps: DeviceCapability[]): boolean {
  return caps.some((c) => c.write && CONTROL_CAPABILITIES.includes(c.id));
}

export type CapabilityGroups = {
  lights: HubHomeDevice[];
  switches: HubHomeDevice[];
  sensors: HubHomeDevice[];
  locks: HubHomeDevice[];
  other: HubHomeDevice[];
};

export function groupByCapabilities(
  entries: Array<{ id: string; device: HubHomeDevice }>,
): CapabilityGroups {
  const groups: CapabilityGroups = {
    lights: [],
    switches: [],
    sensors: [],
    locks: [],
    other: [],
  };

  for (const { device } of entries) {
    const caps = normalizeCapabilities(device.capabilities);
    const ids = new Set(caps.map((c) => c.id));

    if (ids.has("lock")) {
      groups.locks.push(device);
    } else if (ids.has("button") || (device.kind === "switch" && !inferControllable(caps))) {
      groups.switches.push(device);
    } else if (ids.has("dimmer") || ids.has("color")) {
      groups.lights.push(device);
    } else if (ids.has("switch") || ids.has("relay") || device.kind === "switch") {
      if (inferControllable(caps)) {
        groups.switches.push(device);
      } else {
        groups.switches.push(device);
      }
    } else if (device.kind === "light") {
      groups.lights.push(device);
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
      groups.sensors.push(device);
    } else if (device.kind === "fan") {
      groups.other.push(device);
    } else {
      groups.other.push(device);
    }
  }

  return groups;
}

export function sensorReadingLabel(device: HubHomeDevice): string | null {
  const parts: string[] = [];
  if (device.temperature_c != null && Number.isFinite(device.temperature_c)) {
    parts.push(`${device.temperature_c.toFixed(1)} °C`);
  }
  if (device.humidity_pct != null && Number.isFinite(device.humidity_pct)) {
    parts.push(`${Math.round(device.humidity_pct)} %`);
  }
  if (device.co2_ppm != null && Number.isFinite(device.co2_ppm)) {
    parts.push(`${Math.round(device.co2_ppm)} ppm CO₂`);
  }
  if (device.power_w != null && Number.isFinite(device.power_w)) {
    parts.push(`${Math.round(device.power_w)} W`);
  }
  if (device.locked != null) {
    parts.push(device.locked ? "Lukossa" : "Auki");
  }
  if (device.on != null && hasCapability(device.capabilities, "switch")) {
    parts.push(device.on ? "Päällä" : "Pois");
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
