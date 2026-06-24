import type { HubState } from "@/lib/types";

/** Keskusyksikön online-rajat (hub synkkaa ~120 s välein). */
export const HUB_ONLINE_TIMEOUT_MS = 150_000;
export const PING_INTERVAL_MS = 30_000;

export type ConnectivityLevel = "ok" | "degraded" | "offline";

export type HubConnectivity = {
  online: boolean;
  last_seen_at: string | null;
  last_seen_label: string;
};

export type AirfiSource = "hub" | "local_modbus";

export type AirfiConnectivity = {
  online: boolean;
  /** hub = ESP32-silta; local_modbus = dev-palvelin lukee suoraan. */
  source: AirfiSource;
};

export type DeviceStatus = {
  hub: HubConnectivity;
  airfi: AirfiConnectivity;
  /** Molemmat yhteydessä. */
  online: boolean;
  level: ConnectivityLevel;
  message: string | null;
  checked_at: string;
  /** Live-tila ohjauspaneelia varten. */
  live?: {
    control_mode: string;
    fan_supply_pct: number | null;
    fan_exhaust_pct: number | null;
    fan_supply_target: number | null;
    fan_exhaust_target: number | null;
    lto_temp_efficiency_pct: number | null;
    lto_energy_efficiency_pct: number | null;
    lto_bypass_on: boolean;
    co2_ppm: number | null;
    humidity_pct: number | null;
    pm25_ugm3: number | null;
    temperature_c: number | null;
    fireplace_until: string | null;
    hood_until: string | null;
    away_until: string | null;
    away_unlimited: boolean;
    away_mode: boolean;
    emergency_stop: boolean;
    freezing_alarm: boolean;
    machine_fault: boolean;
    airfi_error_raw: number | null;
    airfi_errors: string[];
    fan_speed_level: number | null;
    temp_setpoint_c: number | null;
    filter_change_per_year: number | null;
    sauna_mode: boolean;
    fireplace_active: boolean;
    airfi_modbus_pause_until: string | null;
    outdoor_temp_c: number | null;
    exhaust_temp_c: number | null;
    supply_room_temp_c: number | null;
  };
};

export function isHubOnline(
  lastSeenAt: string | null,
  timeoutMs = HUB_ONLINE_TIMEOUT_MS,
  now = Date.now(),
): boolean {
  if (!lastSeenAt) return false;
  return now - new Date(lastSeenAt).getTime() < timeoutMs;
}

export function hubLastSeenLabel(
  lastSeenAt: string | null,
  online: boolean,
): string {
  if (!lastSeenAt) return "Ei yhteyttä";
  if (online) return "Online";
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  if (diffMs < 3_600_000) {
    return `Offline · ${Math.round(diffMs / 60_000)} min sitten`;
  }
  return `Offline · ${new Date(lastSeenAt).toLocaleString("fi-FI", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function buildOfflineMessage(
  hub: HubConnectivity,
  airfi: AirfiConnectivity,
): string | null {
  if (hub.online && airfi.online) return null;

  const parts: string[] = [];
  if (!hub.online) {
    parts.push(
      hub.last_seen_at
        ? `Keskusyksikkö ei vastaa (${hub.last_seen_label.toLowerCase()})`
        : "Keskusyksikkö ei ole koskaan yhteydessä",
    );
  }
  if (!airfi.online && hub.online && airfi.source === "hub") {
    parts.push("Hub ei saa yhteyttä AirFiin lähiverkossa");
  } else if (!airfi.online && airfi.source === "local_modbus") {
    parts.push("AirFi ei vastaa Modbus-yhteydellä");
  }
  return parts.join(" · ");
}

export function connectivityLevel(
  hub: HubConnectivity,
  airfi: AirfiConnectivity,
): ConnectivityLevel {
  if (airfi.online && hub.online) return "ok";
  if (airfi.online && !hub.online) return "degraded";
  if (hub.online && !airfi.online) return "degraded";
  return "offline";
}
