import { HUB_ONLINE_TIMEOUT_MS } from "@/lib/device-status";
import type { HubState } from "@/lib/types";

/** Onko tilassa mitään AirFi-lukemaa (ei pelkkä airfi_online-lippu). */
export function hasAirfiTelemetry(
  state: Partial<HubState> | null | undefined,
): boolean {
  if (!state) return false;
  const values = [
    state.outdoor_temp_c,
    state.exhaust_temp_c,
    state.supply_room_temp_c,
    state.exhaust_hru_temp_c,
    state.supply_hru_temp_c,
    state.fan_supply_pct,
    state.fan_exhaust_pct,
    state.fan_speed,
    state.supply_airflow_m3h,
    state.exhaust_airflow_m3h,
    state.lto_temp_efficiency_pct,
  ];
  return values.some((v) => v != null && Number.isFinite(v));
}

/** Päätä AirFi-online hubin tallennetusta tilasta (Vercel ei pingaa lähiverkkoa). */
export function inferAirfiOnline(
  hubOnline: boolean,
  state: Partial<HubState> | null | undefined,
  hubReported?: boolean | null,
  hubLastSeenAt?: string | null,
): boolean {
  if (!hubOnline) return false;
  if (hasAirfiTelemetry(state)) return true;
  if (hubReported === true) return true;
  if (state?.airfi_updated_at) {
    const age = Date.now() - new Date(state.airfi_updated_at).getTime();
    if (age >= 0 && age < 30 * 60_000) return true;
  }
  // Aktiivinen hub synkkaa — yksittäinen Modbus-epäonnistuminen ei saa näyttää offlinea.
  if (hubLastSeenAt) {
    const hubAge = Date.now() - new Date(hubLastSeenAt).getTime();
    if (hubAge >= 0 && hubAge < HUB_ONLINE_TIMEOUT_MS) return true;
  }
  return false;
}
