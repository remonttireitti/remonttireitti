import { HUB_ONLINE_TIMEOUT_MS } from "@/lib/device-status";
import type { HubState } from "@/lib/types";

/** Kuinka tuore AirFi-lukeman pitää olla, jotta laite näytetään online-tilassa. */
export const AIRFI_FRESH_MS = 10 * 60_000;

const AIRFI_READING_KEYS: (keyof HubState)[] = [
  "outdoor_temp_c",
  "exhaust_temp_c",
  "supply_room_temp_c",
  "exhaust_hru_temp_c",
  "supply_hru_temp_c",
  "fan_supply_pct",
  "fan_exhaust_pct",
  "fan_speed",
  "supply_airflow_m3h",
  "exhaust_airflow_m3h",
  "lto_temp_efficiency_pct",
  "humidity_pct",
];

/** Onko tilassa mitään AirFi-lukemaa (ei pelkkä airfi_online-lippu). */
export function hasAirfiTelemetry(
  state: Partial<HubState> | null | undefined,
): boolean {
  if (!state) return false;
  return AIRFI_READING_KEYS.some(
    (key) => {
      const v = state[key];
      return v != null && Number.isFinite(v as number);
    },
  );
}

export function isAirfiTelemetryFresh(
  state: Partial<HubState> | null | undefined,
  now = Date.now(),
): boolean {
  if (!state?.airfi_updated_at) return false;
  const age = now - new Date(state.airfi_updated_at).getTime();
  return age >= 0 && age < AIRFI_FRESH_MS;
}

/** Poista vanhentuneet AirFi-lukemat kun Modbus ei vastaa. */
export function clearStaleAirfiReadings(state: HubState): void {
  for (const key of AIRFI_READING_KEYS) {
    (state as Record<string, unknown>)[key] = null;
  }
  state.fan_supply_target = null;
  state.fan_exhaust_target = null;
  state.fan_speed_target = null;
  state.airfi_errors = [];
  state.airfi_error_raw = null;
}

/** Päätä AirFi-online hubin tallennetusta tilasta (Vercel ei pingaa lähiverkkoa). */
export function inferAirfiOnline(
  hubOnline: boolean,
  state: Partial<HubState> | null | undefined,
  hubReported?: boolean | null,
  hubLastSeenAt?: string | null,
): boolean {
  if (!hubOnline) return false;
  if (hubReported === false) {
    return isAirfiTelemetryFresh(state) && hasAirfiTelemetry(state);
  }
  if (state?.airfi_online === false && !isAirfiTelemetryFresh(state)) {
    return false;
  }
  if (isAirfiTelemetryFresh(state) && hasAirfiTelemetry(state)) return true;
  if (hubReported === true && isAirfiTelemetryFresh(state)) return true;
  // Hub synkkaa mutta AirFi-data on vanhentunutta — ei online.
  if (hubLastSeenAt && isHubRecentlySeen(hubLastSeenAt) && !isAirfiTelemetryFresh(state)) {
    return false;
  }
  return false;
}

function isHubRecentlySeen(lastSeenAt: string, now = Date.now()): boolean {
  return now - new Date(lastSeenAt).getTime() < HUB_ONLINE_TIMEOUT_MS;
}
