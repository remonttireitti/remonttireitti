import { deviceHasTemperatureReading } from "@/lib/device-roles";
import type { HeatingThermostat } from "@/lib/types";
import type { HubLightDevice } from "@/lib/hub-lights";

export type { HeatingThermostat };

export const DEFAULT_HYSTERESIS_C = 0.5;
export const DEFAULT_MIN_ON_SEC = 120;
export const DEFAULT_MIN_OFF_SEC = 120;

export function newThermostatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `thermostat-${Date.now()}`;
}

export function normalizeHeatingThermostats(raw: unknown): HeatingThermostat[] {
  if (!Array.isArray(raw)) return [];
  const out: HeatingThermostat[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string") continue;
    const sensor = row.sensor_device_id;
    const actuator = row.actuator_device_id;
    const target = row.target_temp_c;
    if (typeof sensor !== "string" || !sensor.includes(":")) continue;
    if (typeof actuator !== "string" || !actuator.includes(":")) continue;
    if (typeof target !== "number" || !Number.isFinite(target)) continue;

    const hysteresis =
      typeof row.hysteresis_c === "number" && Number.isFinite(row.hysteresis_c)
        ? Math.max(0.1, Math.min(5, row.hysteresis_c))
        : DEFAULT_HYSTERESIS_C;

    const thermostat: HeatingThermostat = {
      id: row.id,
      name: row.name.trim() || "Termostaatti",
      enabled: row.enabled !== false,
      sensor_device_id: sensor,
      actuator_device_id: actuator,
      target_temp_c: Math.round(target * 10) / 10,
      hysteresis_c: hysteresis,
      room: typeof row.room === "string" ? row.room : row.room === null ? null : undefined,
    };

    if (typeof row.min_on_sec === "number" && Number.isFinite(row.min_on_sec)) {
      thermostat.min_on_sec = Math.max(0, Math.round(row.min_on_sec));
    }
    if (typeof row.min_off_sec === "number" && Number.isFinite(row.min_off_sec)) {
      thermostat.min_off_sec = Math.max(0, Math.round(row.min_off_sec));
    }

    out.push(thermostat);
  }
  return out;
}

/** Lämpötila-anturi termostaattiin — sis. Smart Implant -kanavat ja turvallisuuslaitteet. */
export function isTemperatureSensorDevice(device: HubLightDevice): boolean {
  if (deviceHasTemperatureReading(device)) return true;
  if (device.secondaryUses?.includes("heating_temperature")) return true;
  if (/lämpöanturi|lämpötila|\btemp\b/i.test(device.name)) return true;
  return false;
}

/** Lämmitystoimilainen — kaikki ohjattavat releet/kytkimet (Shelly, Implant, Z-Wave). */
export function isHeatingActuatorDevice(device: HubLightDevice): boolean {
  if (!device.controllable) return false;
  const capIds = new Set(device.capabilities?.map((c) => c.id) ?? []);
  if (capIds.has("lock") || device.kind === "lock") return false;

  if (capIds.has("switch") || capIds.has("relay") || capIds.has("dimmer") || capIds.has("fan")) {
    return true;
  }
  if (
    device.role === "heating" ||
    device.role === "other_control" ||
    device.role === "light_switch" ||
    device.role === "fan" ||
    device.role === "dimmer" ||
    device.role === "light"
  ) {
    return true;
  }
  if (device.kind === "switch" || device.kind === "fan" || device.kind === "light") return true;
  if (/rele out|rele \d|out \d/i.test(device.name)) return true;
  return false;
}

export function thermostatSummary(zone: HeatingThermostat, devices: HubLightDevice[]): string {
  const sensor = devices.find((d) => d.id === zone.sensor_device_id);
  const actuator = devices.find((d) => d.id === zone.actuator_device_id);
  const parts = [
    `Tavoite ${zone.target_temp_c.toFixed(1)} °C`,
    `±${zone.hysteresis_c.toFixed(1)} °C`,
  ];
  if (sensor?.readingLabel) parts.push(sensor.readingLabel);
  else if (sensor?.temperature_c != null) parts.push(`${sensor.temperature_c.toFixed(1)} °C`);
  if (actuator) parts.push(actuator.on ? "Lämmitys päällä" : "Lämmitys pois");
  return parts.join(" · ");
}
