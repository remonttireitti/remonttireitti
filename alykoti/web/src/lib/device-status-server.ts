import { canPingAirfiFromRuntime } from "@/lib/airfi-runtime";
import { pingAirfiFast } from "@/lib/airfi";
import {
  buildOfflineMessage,
  connectivityLevel,
  hubLastSeenLabel,
  isHubOnline,
  type AirfiConnectivity,
  type DeviceStatus,
} from "@/lib/device-status";
import { recordHubMetrics } from "@/lib/metric-samples";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { SupabaseClient } from "@supabase/supabase-js";

async function resolveAirfiConnectivity(
  hubOnline: boolean,
  airfiOnlineFromHub: boolean | null | undefined,
): Promise<AirfiConnectivity> {
  if (canPingAirfiFromRuntime()) {
    return { online: await pingAirfiFast(), source: "local_modbus" };
  }

  return {
    online: hubOnline && airfiOnlineFromHub === true,
    source: "hub",
  };
}

export async function getDeviceStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<DeviceStatus | null> {
  const hub = await fetchPrimaryHub(supabase, userId);
  if (!hub) return null;

  const hubOnline = isHubOnline(hub.last_seen_at);
  const hubConn = {
    online: hubOnline,
    last_seen_at: hub.last_seen_at,
    last_seen_label: hubLastSeenLabel(hub.last_seen_at, hubOnline),
  };
  const airfiConn = await resolveAirfiConnectivity(
    hubOnline,
    hub.state.airfi_online,
  );
  const level = connectivityLevel(hubConn, airfiConn);

  void recordHubMetrics(hub.id, hub.state, hub.control_mode, {
    hub_online: hubOnline,
    airfi_online: airfiConn.online,
  });

  return {
    hub: hubConn,
    airfi: airfiConn,
    online: level === "ok",
    level,
    message: buildOfflineMessage(hubConn, airfiConn),
    checked_at: new Date().toISOString(),
  };
}
