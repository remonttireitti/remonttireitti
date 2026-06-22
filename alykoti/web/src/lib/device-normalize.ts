import {
  inferControllable,
  inferKindFromCapabilities,
  normalizeCapabilities,
} from "@/lib/capabilities";
import type { HubHomeDevice, HubIntegrations, HubState } from "@/lib/types";

const AIRTHINGS_CAPS = [
  { id: "temperature" as const, read: true, write: false },
  { id: "humidity" as const, read: true, write: false },
  { id: "co2" as const, read: true, write: false },
  { id: "tvoc" as const, read: true, write: false },
  { id: "pm" as const, read: true, write: false },
];

function normalizeDevice(device: HubHomeDevice): HubHomeDevice {
  const capabilities = normalizeCapabilities(device.capabilities);
  const kind = device.kind ?? (capabilities.length ? inferKindFromCapabilities(capabilities) : "other");
  const controllable =
    device.controllable === true ||
    (device.controllable !== false && inferControllable(capabilities));

  return {
    ...device,
    capabilities: capabilities.length ? capabilities : device.capabilities,
    kind,
    controllable,
  };
}

function mergeAirthingsDevices(
  home: Record<string, HubHomeDevice>,
  integrations: HubIntegrations | undefined,
  sensor: HubState | null | undefined,
): Record<string, HubHomeDevice> {
  const out = { ...home };
  const configured = integrations?.airthings?.devices ?? [];

  for (const cfg of configured) {
    if (!cfg.enabled) continue;
    const id = cfg.id || `airthings:${cfg.serial}`;
    out[id] = {
      protocol: "airthings",
      kind: "sensor",
      name: cfg.name || "Airthings",
      controllable: false,
      capabilities: AIRTHINGS_CAPS,
      temperature_c: sensor?.temperature_c ?? null,
      humidity_pct: sensor?.humidity_pct ?? null,
      co2_ppm: sensor?.co2_ppm ?? null,
      tvoc_ppb: sensor?.tvoc_ppb ?? null,
    };
  }

  return out;
}

export function normalizeHomeDevices(
  home: HubState["home_devices"],
  options?: {
    integrations?: HubIntegrations;
    airthingsState?: HubState | null;
  },
): HubState["home_devices"] {
  if (!home || typeof home !== "object") {
    return mergeAirthingsDevices({}, options?.integrations, options?.airthingsState);
  }

  const normalized: Record<string, HubHomeDevice> = {};
  for (const [id, device] of Object.entries(home)) {
    normalized[id] = normalizeDevice(device);
  }

  return mergeAirthingsDevices(normalized, options?.integrations, options?.airthingsState);
}
