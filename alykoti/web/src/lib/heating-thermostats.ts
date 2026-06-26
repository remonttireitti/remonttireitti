import type { DeviceReading } from "@/lib/capabilities";
import { canWrite, hasCapability } from "@/lib/capabilities";
import { deviceHasTemperatureReading } from "@/lib/device-roles";
import type { HeatingThermostat, HeatingPumpConfig } from "@/lib/types";
import type { HubLightDevice } from "@/lib/hub-lights";

export type { HeatingThermostat, HeatingPumpConfig };

export const DEFAULT_HYSTERESIS_C = 0.5;
export const DEFAULT_MIN_ON_SEC = 120;
export const DEFAULT_MIN_OFF_SEC = 120;
export const DEFAULT_PUMP_START_DELAY_SEC = 60;

export function newThermostatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `thermostat-${Date.now()}`;
}

function parseActuatorIds(row: Record<string, unknown>): string[] {
  if (Array.isArray(row.actuator_device_ids)) {
    return row.actuator_device_ids.filter(
      (id): id is string => typeof id === "string" && id.includes(":"),
    );
  }
  const legacy = row.actuator_device_id;
  if (typeof legacy === "string" && legacy.includes(":")) {
    return [legacy];
  }
  return [];
}

export function normalizeHeatingThermostats(raw: unknown): HeatingThermostat[] {
  if (!Array.isArray(raw)) return [];
  const out: HeatingThermostat[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string") continue;
    const sensor = row.sensor_device_id;
    const actuatorIds = parseActuatorIds(row);
    const target = row.target_temp_c;
    if (typeof sensor !== "string" || !sensor.includes(":")) continue;
    if (actuatorIds.length === 0) continue;
    if (typeof target !== "number" || !Number.isFinite(target)) continue;

    const hysteresis =
      typeof row.hysteresis_c === "number" && Number.isFinite(row.hysteresis_c)
        ? Math.max(0.1, Math.min(5, row.hysteresis_c))
        : DEFAULT_HYSTERESIS_C;

    const sensorReadingLabel =
      typeof row.sensor_reading_label === "string"
        ? row.sensor_reading_label.trim() || null
        : row.sensor_reading_label === null
          ? null
          : undefined;

    const thermostat: HeatingThermostat = {
      id: row.id,
      name: row.name.trim() || "Termostaatti",
      enabled: row.enabled !== false,
      sensor_device_id: sensor,
      sensor_reading_label: sensorReadingLabel,
      actuator_device_ids: actuatorIds,
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

export function normalizeHeatingPump(raw: unknown): HeatingPumpConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const actuator = row.actuator_device_id;
  if (typeof actuator !== "string" || !actuator.includes(":")) return null;

  const start_delay =
    typeof row.start_delay_sec === "number" && Number.isFinite(row.start_delay_sec)
      ? Math.max(0, Math.round(row.start_delay_sec))
      : DEFAULT_PUMP_START_DELAY_SEC;

  return {
    enabled: row.enabled !== false,
    actuator_device_id: actuator,
    start_delay_sec: start_delay,
  };
}

/** Lämpötilalukemat laitteelta — termostaatin anturivalintaa varten. */
export function temperatureReadingsForSensor(device: HubLightDevice): DeviceReading[] {
  const fromReadings = (device.readings ?? []).filter((r) => r.value.includes("°C"));
  if (fromReadings.length > 0) return fromReadings;
  if (device.temperature_c != null && Number.isFinite(device.temperature_c)) {
    return [{ label: "Lämpötila", value: `${device.temperature_c.toFixed(1)} °C` }];
  }
  return [];
}

export function parseSensorTemperature(
  device: HubLightDevice | undefined,
  readingLabel?: string | null,
): number | null {
  if (!device) return null;
  const readings = temperatureReadingsForSensor(device);
  if (readingLabel) {
    const match = readings.find((r) => r.label === readingLabel);
    if (match) {
      const n = Number.parseFloat(match.value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  if (device.temperature_c != null && Number.isFinite(device.temperature_c)) {
    return device.temperature_c;
  }
  const first = readings[0];
  if (first) {
    const n = Number.parseFloat(first.value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Lämpötila-anturi termostaattiin — mikä tahansa laite jolla on lämpötilalukema. */
export function isThermostatSensorDevice(device: HubLightDevice): boolean {
  return deviceHasTemperatureReading(device);
}

/** Lämmitystoimilainen — ohjattava kytkin/rele. */
export function isThermostatActuatorDevice(device: HubLightDevice): boolean {
  if (!device.controllable) return false;
  const caps = device.capabilities ?? [];
  if (hasCapability(caps, "lock") || device.kind === "lock") return false;
  return canWrite(caps, "switch") || canWrite(caps, "relay");
}

/** @deprecated Käytä isThermostatSensorDevice */
export function isTemperatureSensorDevice(device: HubLightDevice): boolean {
  return isThermostatSensorDevice(device);
}

/** @deprecated Käytä isThermostatActuatorDevice */
export function isHeatingActuatorDevice(device: HubLightDevice): boolean {
  return isThermostatActuatorDevice(device);
}

export function thermostatSummary(zone: HeatingThermostat, devices: HubLightDevice[]): string {
  const sensor = devices.find((d) => d.id === zone.sensor_device_id);
  const actuators = zone.actuator_device_ids
    .map((id) => devices.find((d) => d.id === id))
    .filter((d): d is HubLightDevice => d != null);
  const parts = [
    `Tavoite ${zone.target_temp_c.toFixed(1)} °C`,
    `±${zone.hysteresis_c.toFixed(1)} °C`,
  ];
  const temp = parseSensorTemperature(sensor, zone.sensor_reading_label);
  if (temp != null) parts.push(`${temp.toFixed(1)} °C`);
  else if (sensor?.readingLabel) parts.push(sensor.readingLabel);
  const anyOn = actuators.some((a) => a.on);
  if (actuators.length > 0) parts.push(anyOn ? "Lämmitys päällä" : "Lämmitys pois");
  return parts.join(" · ");
}
