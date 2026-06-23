import type { HubDeviceOverride } from "@/lib/types";
import type { HubLightDevice } from "@/lib/hub-lights";

/** Käyttäjän valitsema laitekohtainen rooli (tallennetaan device_overrides). */
export type DeviceRole =
  | "light"
  | "light_switch"
  | "heating"
  | "other_control"
  | "contact"
  | "fire_alarm"
  | "leak_detector"
  | "motion"
  | "sensor";

export const DEVICE_ROLE_OPTIONS: {
  id: DeviceRole;
  label: string;
  hint?: string;
}[] = [
  { id: "light", label: "Valo", hint: "Näkyy Valot-sivulla ja kartalla" },
  { id: "light_switch", label: "Valokytkin", hint: "Kaukosäädin / kytkin valoille" },
  { id: "heating", label: "Lämmitys", hint: "Lämmityksen ohjaus" },
  { id: "other_control", label: "Muu ohjaus", hint: "Releet, Shelly, Tasmota jne." },
  { id: "contact", label: "Ikkuna/ovikytkin", hint: "Turvallisuus" },
  { id: "fire_alarm", label: "Palohälytin", hint: "Turvallisuus" },
  { id: "leak_detector", label: "Vuotoilmaisin", hint: "Turvallisuus" },
  { id: "motion", label: "Liiketunnistin", hint: "Turvallisuus" },
  { id: "sensor", label: "Anturi", hint: "Lämpö, kosteus, CO₂ — ei valoihin" },
];

export const DEVICE_ROLE_LABEL: Record<DeviceRole, string> = Object.fromEntries(
  DEVICE_ROLE_OPTIONS.map((o) => [o.id, o.label]),
) as Record<DeviceRole, string>;

export function deviceRoleLabel(role: DeviceRole | undefined): string {
  if (!role) return "Automaattinen";
  return DEVICE_ROLE_LABEL[role] ?? role;
}

export const LIGHT_PAGE_ROLES: DeviceRole[] = ["light", "light_switch"];
export const HEATING_PAGE_ROLES: DeviceRole[] = ["heating"];
export const SECURITY_PAGE_ROLES: DeviceRole[] = [
  "contact",
  "fire_alarm",
  "leak_detector",
  "motion",
];

function capabilityIds(device: HubLightDevice): Set<string> {
  return new Set(device.capabilities.map((c) => c.id));
}

function normalizeNameKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/** Päättele rooli laitteen nimestä (suomi/englanti). */
export function inferDeviceRoleFromName(name: string): DeviceRole | null {
  const n = normalizeNameKey(name);
  if (!n) return null;

  if (/palohalyt|palohaly|smoke|fire/.test(n)) return "fire_alarm";
  if (/vuoto|leak/.test(n) || (/\bwater\b/.test(n) && !/water_heater/.test(n))) return "leak_detector";
  if (/liike|motion/.test(n)) return "motion";
  if (/\b(ovi|ikkuna|contact)\b/.test(n)) return "contact";
  if (/lammitys|heating|lattia|radiator|floorheat/.test(n)) return "heating";

  if (/valokytkin/.test(n)) return "light_switch";
  const hasLightWord = /\b(valo|light|lamppu)\b/.test(n) || /\bvalo\b/.test(n);
  const hasSwitchWord = /\b(kytkin|switch)\b/.test(n);
  if (hasSwitchWord && !hasLightWord) return "light_switch";
  if (hasLightWord) return "light";

  if (/anturi|sensor|temp|kosteus|co2|humidity/.test(n)) return "sensor";
  if (/lukko|lock/.test(n)) return "other_control";
  if (/\b(energia|em|mittari|meter)\b/.test(n)) return "other_control";

  return null;
}

function nameInferenceSources(device: HubLightDevice): string[] {
  return [device.name, device.description, device.model].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}

/** Päättele rooli ominaisuuksista kun käyttäjä ei ole valinnut. */
export function inferDeviceRole(device: HubLightDevice): DeviceRole {
  for (const source of nameInferenceSources(device)) {
    const fromName = inferDeviceRoleFromName(source);
    if (fromName) return fromName;
  }

  const ids = capabilityIds(device);
  const state = device.sensor_state?.toLowerCase() ?? "";

  if (ids.has("lock") || device.kind === "lock") return "other_control";

  if (ids.has("smoke") || state.includes("smoke") || state.includes("fire")) {
    return "fire_alarm";
  }
  if (ids.has("water_leak") || state === "water_leak") return "leak_detector";
  if (ids.has("motion") || ids.has("occupancy") || state === "motion") return "motion";
  if (ids.has("contact") || state === "contact") return "contact";

  const envOnly =
    (ids.has("temperature") ||
      ids.has("humidity") ||
      ids.has("co2") ||
      ids.has("tvoc") ||
      ids.has("pm") ||
      ids.has("illuminance")) &&
    !ids.has("switch") &&
    !ids.has("relay") &&
    !ids.has("dimmer");

  if (envOnly || (device.kind === "sensor" && !ids.has("button"))) return "sensor";

  if (device.protocol === "shelly" || device.protocol === "tasmota") {
    if (ids.has("dimmer") || ids.has("color")) return "light";
    return "other_control";
  }

  const model = `${device.model ?? ""} ${device.description ?? ""}`.toLowerCase();
  if (model.includes("implant")) return "other_control";

  if (ids.has("dimmer") || ids.has("color") || device.kind === "light") return "light";

  if (ids.has("button") || (device.kind === "switch" && !device.controllable)) {
    return "light_switch";
  }

  if (ids.has("energy") || ids.has("meter")) return "other_control";

  if (ids.has("switch") || ids.has("relay")) return "light_switch";

  return "other_control";
}

export function resolveDeviceRole(
  device: HubLightDevice,
  override?: HubDeviceOverride,
): DeviceRole {
  if (override?.role) return override.role;
  return inferDeviceRole(device);
}

export function filterDevicesByRoles(
  devices: HubLightDevice[],
  roles: DeviceRole[],
  overrides?: Record<string, HubDeviceOverride>,
): HubLightDevice[] {
  const set = new Set(roles);
  return devices.filter((d) => set.has(resolveDeviceRole(d, overrides?.[d.id])));
}

export type RoleGroups = {
  lights: HubLightDevice[];
  lightSwitches: HubLightDevice[];
  heating: HubLightDevice[];
  otherControl: HubLightDevice[];
  contact: HubLightDevice[];
  fireAlarms: HubLightDevice[];
  leakDetectors: HubLightDevice[];
  motion: HubLightDevice[];
  sensors: HubLightDevice[];
  locks: HubLightDevice[];
};

export function groupDevicesByRole(
  devices: HubLightDevice[],
  overrides?: Record<string, HubDeviceOverride>,
): RoleGroups {
  const groups: RoleGroups = {
    lights: [],
    lightSwitches: [],
    heating: [],
    otherControl: [],
    contact: [],
    fireAlarms: [],
    leakDetectors: [],
    motion: [],
    sensors: [],
    locks: [],
  };

  for (const device of devices) {
    const ids = capabilityIds(device);
    if (ids.has("lock") || device.kind === "lock") {
      groups.locks.push(device);
      continue;
    }

    const role = resolveDeviceRole(device, overrides?.[device.id]);
    switch (role) {
      case "light":
        groups.lights.push(device);
        break;
      case "light_switch":
        groups.lightSwitches.push(device);
        break;
      case "heating":
        groups.heating.push(device);
        break;
      case "other_control":
        groups.otherControl.push(device);
        break;
      case "contact":
        groups.contact.push(device);
        break;
      case "fire_alarm":
        groups.fireAlarms.push(device);
        break;
      case "leak_detector":
        groups.leakDetectors.push(device);
        break;
      case "motion":
        groups.motion.push(device);
        break;
      case "sensor":
        groups.sensors.push(device);
        break;
    }
  }

  return groups;
}
