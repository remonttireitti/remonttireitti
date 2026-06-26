import type { DeviceReading } from "@/lib/capabilities";
import { READING_ITEM_KEYS, zwavePropertyItemKey } from "@/lib/device-item-overrides";
import {
  deviceMetricKey,
  deviceMetricKeyForReading,
  zwavePropertyMetricField,
} from "@/lib/device-metrics";
import type { ZwaveProperty } from "@/lib/types";

export type ResolvedDeviceReading = {
  itemKey?: string;
  label: string;
  value: string;
  metric: string;
};

function pushUnique(out: ResolvedDeviceReading[], row: ResolvedDeviceReading) {
  if (out.some((r) => r.metric === row.metric)) return;
  out.push(row);
}

/** "Lämpötila: 22 · Savu: OK" → erilliset trendirivit. */
export function parseReadingLabelString(
  label: string,
  deviceId: string,
): ResolvedDeviceReading[] {
  const out: ResolvedDeviceReading[] = [];
  for (const part of label.split("·").map((s) => s.trim()).filter(Boolean)) {
    const colon = part.indexOf(":");
    if (colon <= 0) continue;
    const name = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (!name || !value) continue;
    pushUnique(out, {
      label: name,
      value,
      metric: deviceMetricKeyForReading(deviceId, name),
    });
  }
  return out;
}

export function resolveHubDeviceReadings(
  device: {
    id: string;
    temperature_c?: number | null;
    humidity_pct?: number | null;
    battery_pct?: number | null;
    co2_ppm?: number | null;
    illuminance_lux?: number | null;
    power_w?: number | null;
    voltage_v?: number | null;
    on?: boolean;
    locked?: boolean | null;
    readingLabel?: string | null;
    readings?: DeviceReading[];
    sensor_state?: string | null;
  },
  itemNames?: Record<string, string>,
): ResolvedDeviceReading[] {
  const out: ResolvedDeviceReading[] = [];
  const id = device.id;

  if (device.temperature_c != null && Number.isFinite(device.temperature_c)) {
    pushUnique(out, {
      itemKey: READING_ITEM_KEYS.temperature,
      label: itemNames?.[READING_ITEM_KEYS.temperature]?.trim() || "Lämpötila",
      value: `${device.temperature_c.toFixed(1)} °C`,
      metric: deviceMetricKey(id, "temperature_c"),
    });
  }
  if (device.humidity_pct != null && Number.isFinite(device.humidity_pct)) {
    pushUnique(out, {
      itemKey: READING_ITEM_KEYS.humidity,
      label: "Kosteus",
      value: `${Math.round(device.humidity_pct)} %`,
      metric: deviceMetricKey(id, "humidity_pct"),
    });
  }
  if (device.battery_pct != null && Number.isFinite(device.battery_pct)) {
    pushUnique(out, {
      itemKey: READING_ITEM_KEYS.battery,
      label: "Akku",
      value: `${Math.round(device.battery_pct)} %`,
      metric: deviceMetricKey(id, "battery_pct"),
    });
  }
  if (device.co2_ppm != null && Number.isFinite(device.co2_ppm)) {
    pushUnique(out, {
      itemKey: READING_ITEM_KEYS.co2,
      label: "CO₂",
      value: `${Math.round(device.co2_ppm)} ppm`,
      metric: deviceMetricKey(id, "co2_ppm"),
    });
  }
  if (device.illuminance_lux != null && Number.isFinite(device.illuminance_lux)) {
    pushUnique(out, {
      itemKey: READING_ITEM_KEYS.illuminance,
      label: "Valoisuus",
      value: `${Math.round(device.illuminance_lux)} lx`,
      metric: deviceMetricKey(id, "illuminance_lux"),
    });
  }
  if (device.power_w != null && Number.isFinite(device.power_w)) {
    pushUnique(out, {
      itemKey: READING_ITEM_KEYS.power,
      label: "Teho",
      value: `${Math.round(device.power_w)} W`,
      metric: deviceMetricKey(id, "power_w"),
    });
  }
  if (device.voltage_v != null && Number.isFinite(device.voltage_v)) {
    pushUnique(out, {
      label: "Jännite",
      value: `${device.voltage_v.toFixed(1)} V`,
      metric: deviceMetricKey(id, "voltage_v"),
    });
  }
  if (device.sensor_state) {
    pushUnique(out, {
      itemKey: READING_ITEM_KEYS.sensor_state,
      label: "Tila",
      value: device.sensor_state,
      metric: deviceMetricKeyForReading(id, "Tila"),
    });
  }

  for (const r of device.readings ?? []) {
    pushUnique(out, readingToResolved(id, r));
  }

  if (device.on != null) {
    pushUnique(out, {
      label: "Kytkin",
      value: device.on ? "Päällä" : "Pois",
      metric: deviceMetricKey(id, "state:on"),
    });
  }
  if (device.locked != null) {
    pushUnique(out, {
      label: "Lukko",
      value: device.locked ? "Lukossa" : "Auki",
      metric: deviceMetricKey(id, "state:locked"),
    });
  }

  if (device.readingLabel?.trim()) {
    for (const r of parseReadingLabelString(device.readingLabel.trim(), id)) {
      pushUnique(out, r);
    }
  }

  return out;
}

export function readingToResolved(deviceId: string, reading: DeviceReading): ResolvedDeviceReading {
  return {
    label: reading.label,
    value: reading.value,
    metric: deviceMetricKeyForReading(deviceId, reading.label),
  };
}

export function resolveZwavePropertyReading(
  nodeDeviceId: string,
  prop: ZwaveProperty,
  nodeId: number,
  value: string,
  label: string,
): ResolvedDeviceReading {
  const field = zwavePropertyMetricField(prop, nodeId);
  return {
    itemKey: zwavePropertyItemKey(prop),
    label,
    value,
    metric: deviceMetricKey(nodeDeviceId, field),
  };
}
