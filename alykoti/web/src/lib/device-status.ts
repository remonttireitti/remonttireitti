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
  if (airfi.online) return "degraded";
  if (!hub.online) return "degraded";
  return "offline";
}
