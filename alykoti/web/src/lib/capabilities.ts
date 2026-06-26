import { formatZwavePropertyReadings } from "@/lib/zwave-detail";
import type { DeviceCapability, DeviceCapabilityId, HubHomeDevice, HubState, ZwaveProperty } from "@/lib/types";

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
  illuminance: "Valoisuus",
  smoke: "Savu",
  water_leak: "Vesivuoto",
  input: "Tulo IN",
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
  const normalized = normalizeCapabilities(caps);
  const ids = new Set(normalized.map((c) => c.id));
  const hasEnv =
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
    ids.has("illuminance") ||
    ids.has("smoke") ||
    ids.has("water_leak") ||
    ids.has("battery");
  if (ids.has("button") && hasEnv) return "sensor";
  if (ids.has("lock")) return "lock";
  if (canWrite(normalized, "color") || canWrite(normalized, "dimmer")) return "light";
  if (canWrite(normalized, "switch") || canWrite(normalized, "relay")) return "switch";
  if (ids.has("switch") || ids.has("relay")) return "switch";
  if (ids.has("fan")) return "fan";
  if (hasEnv) return "sensor";
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
    } else if (
      ids.has("button") &&
      (ids.has("temperature") || ids.has("humidity") || device.kind === "sensor")
    ) {
      groups.sensors.push(device);
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
      ids.has("illuminance") ||
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

const SENSOR_STATE_LABELS: Record<string, string> = {
  water_leak: "Vesivuoto",
  smoke: "Savu",
  co: "CO-hälytys",
  motion: "Liike",
  contact: "Ovi/ikkuna",
  tamper: "Peukalointi",
};

export type DeviceReading = { label: string; value: string; itemKey?: string };

export function sensorStateLabel(state: string | null | undefined): string | null {
  if (!state) return null;
  return SENSOR_STATE_LABELS[state] ?? state;
}

function formatAlarmReading(sensorState: string, on: boolean | undefined | null): string {
  switch (sensorState) {
    case "water_leak":
      return on ? "Vuoto" : "Kuiva";
    case "smoke":
    case "co":
      return on ? "Hälytys" : "OK";
    case "motion":
      return on ? "Liike" : "Ei liikettä";
    case "contact":
      return on ? "Avoin" : "Kiinni";
    case "tamper":
      return on ? "Peukaloitu" : "OK";
    default:
      if (on == null) return sensorStateLabel(sensorState) ?? sensorState;
      return on ? (sensorStateLabel(sensorState) ?? sensorState) : "OK";
  }
}

function hasZwaveScalarCoverage(properties: ZwaveProperty[] | undefined, field: string): boolean {
  if (!properties?.length) return false;
  return properties.some((prop) => {
    const name = (prop.property ?? "").toLowerCase();
    if (field === "temperature" && prop.cc === 49) {
      return name.includes("temperature") || name.includes("air") || !name;
    }
    if (field === "humidity" && prop.cc === 49) return name.includes("humidity");
    if (field === "battery" && prop.cc === 128) return true;
    if (field === "voltage" && prop.cc === 49) return name.includes("voltage");
    if (field === "illuminance" && prop.cc === 49) {
      return name.includes("luminance") || name.includes("illuminance");
    }
    return name.includes(field);
  });
}

function pushReading(
  readings: DeviceReading[],
  seen: Set<string>,
  label: string,
  value: string,
  itemKey?: string,
) {
  const key = `${label}:${value}`;
  if (seen.has(key)) return;
  seen.add(key);
  readings.push({ label, value, ...(itemKey ? { itemKey } : {}) });
}

export function collectDeviceReadings(
  device: HubHomeDevice,
  itemNames?: Record<string, string>,
  zwaveNodeIdNum?: number,
  allOverrides?: HubState["device_overrides"],
  extraProperties?: ZwaveProperty[],
): DeviceReading[] {
  const caps = normalizeCapabilities(device.capabilities);
  const readings: DeviceReading[] = [];
  const seen = new Set<string>();
  const named = (key: string, defaultLabel: string, value: string) => {
    const custom = itemNames?.[key]?.trim();
    pushReading(readings, seen, custom || defaultLabel, value, key);
  };

  const properties = [...(extraProperties ?? []), ...(device.zwave_properties ?? [])];
  if (properties.length > 0 && zwaveNodeIdNum != null) {
    for (const r of formatZwavePropertyReadings(properties, zwaveNodeIdNum, allOverrides)) {
      pushReading(readings, seen, r.label, r.value);
    }
  }

  if (
    device.temperature_c != null &&
    Number.isFinite(device.temperature_c) &&
    hasCapability(caps, "temperature") &&
    !hasZwaveScalarCoverage(properties, "temperature")
  ) {
    named("reading:temperature", "Lämpötila", `${device.temperature_c.toFixed(1)} °C`);
  }
  if (
    device.humidity_pct != null &&
    Number.isFinite(device.humidity_pct) &&
    hasCapability(caps, "humidity") &&
    !hasZwaveScalarCoverage(properties, "humidity")
  ) {
    named("reading:humidity", "Kosteus", `${Math.round(device.humidity_pct)} %`);
  }
  if (
    device.battery_pct != null &&
    Number.isFinite(device.battery_pct) &&
    hasCapability(caps, "battery") &&
    !hasZwaveScalarCoverage(properties, "battery")
  ) {
    named("reading:battery", "Akku", `${Math.round(device.battery_pct)} %`);
  }
  if (
    device.voltage_v != null &&
    Number.isFinite(device.voltage_v) &&
    hasCapability(caps, "meter") &&
    !hasZwaveScalarCoverage(properties, "voltage")
  ) {
    pushReading(readings, seen, "Jännite", `${device.voltage_v.toFixed(1)} V`);
  }
  if (device.co2_ppm != null && Number.isFinite(device.co2_ppm) && hasCapability(caps, "co2")) {
    named("reading:co2", "CO₂", `${Math.round(device.co2_ppm)} ppm`);
  }
  if (
    device.illuminance_lux != null &&
    Number.isFinite(device.illuminance_lux) &&
    hasCapability(caps, "illuminance") &&
    !hasZwaveScalarCoverage(properties, "illuminance")
  ) {
    named("reading:illuminance", "Valoisuus", `${Math.round(device.illuminance_lux)} lx`);
  }
  if (device.power_w != null && Number.isFinite(device.power_w) && hasCapability(caps, "energy")) {
    named("reading:power", "Teho", `${Math.round(device.power_w)} W`);
  }

  const alarmInProps = properties.some((p) => p.cc === 48 || p.cc === 113);
  if (device.sensor_state && !alarmInProps) {
    const state = device.sensor_state;
    if (state === "smoke" && hasCapability(caps, "smoke")) {
      pushReading(readings, seen, "Savu", formatAlarmReading(state, device.on));
    } else if (state === "water_leak" && hasCapability(caps, "water_leak")) {
      pushReading(readings, seen, "Vesivuoto", formatAlarmReading(state, device.on));
    } else if (state === "co" && hasCapability(caps, "co2")) {
      pushReading(readings, seen, "CO", formatAlarmReading(state, device.on));
    } else if (state === "motion" && hasCapability(caps, "motion")) {
      pushReading(readings, seen, "Liike", formatAlarmReading(state, device.on));
    } else if (state === "contact" && hasCapability(caps, "contact")) {
      pushReading(readings, seen, "Ovi/ikkuna", formatAlarmReading(state, device.on));
    } else if (state === "tamper") {
      pushReading(readings, seen, "Peukalointi", formatAlarmReading(state, device.on));
    }
  } else if (!device.sensor_state) {
    if (device.on != null && hasCapability(caps, "contact")) {
      pushReading(readings, seen, "Ovi/ikkuna", device.on ? "Avoin" : "Kiinni");
    } else if (device.on != null && hasCapability(caps, "occupancy")) {
      pushReading(readings, seen, "Paikallaolo", device.on ? "Paikalla" : "Tyhjä");
    } else if (device.on != null && hasCapability(caps, "motion")) {
      pushReading(readings, seen, "Liike", device.on ? "Liike" : "Ei liikettä");
    } else if (device.on != null && hasCapability(caps, "input")) {
      pushReading(readings, seen, "Tulo", device.on ? "Päällä" : "Pois");
    }
  }

  if (device.locked != null && hasCapability(caps, "lock")) {
    named("reading:locked", "Lukko", device.locked ? "Lukossa" : "Auki");
  }
  if (device.on != null && hasCapability(caps, "switch") && canWrite(caps, "switch")) {
    named("reading:switch", "Kytkin", device.on ? "Päällä" : "Pois");
  }

  return readings;
}

export function sensorReadingLabel(
  device: HubHomeDevice,
  itemNames?: Record<string, string>,
  zwaveNodeIdNum?: number,
  allOverrides?: HubState["device_overrides"],
  extraProperties?: ZwaveProperty[],
): string | null {
  const readings = collectDeviceReadings(
    device,
    itemNames,
    zwaveNodeIdNum,
    allOverrides,
    extraProperties,
  );
  if (readings.length === 0) return null;
  return readings.map((r) => `${r.label}: ${r.value}`).join(" · ");
}
