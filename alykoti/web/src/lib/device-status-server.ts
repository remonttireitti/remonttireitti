import { canPingAirfiFromRuntime } from "@/lib/airfi-runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { airfiToHubState, fetchAirfiState, pingAirfiFast } from "@/lib/airfi";
import {
  buildOfflineMessage,
  connectivityLevel,
  hasAirfiTelemetry,
  hubLastSeenLabel,
  isHubOnline,
  type AirfiConnectivity,
  type DeviceStatus,
} from "@/lib/device-status";
import { recordHubMetrics } from "@/lib/metric-samples";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HubState } from "@/lib/types";

async function resolveAirfiConnectivity(
  hubState: HubState,
): Promise<AirfiConnectivity> {
  const canPing = canPingAirfiFromRuntime();

  if (canPing) {
    const online = await pingAirfiFast();
    return { online, check: "live" };
  }

  // Kotiverkon AirFi — pilvipalvelin ei voi pingata. Älä merkitse punaiseksi ilman syytä.
  const online = hasAirfiTelemetry(hubState);
  return { online, check: "lan_only" };
}

export async function getDeviceStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<DeviceStatus | null> {
  const hub = await fetchPrimaryHub(supabase, userId);
  if (!hub) return null;

  const airfiConn = await resolveAirfiConnectivity(hub.state);
  const hubOnline = isHubOnline(hub.last_seen_at);
  const hubConn = {
    online: hubOnline,
    last_seen_at: hub.last_seen_at,
    last_seen_label: hubLastSeenLabel(hub.last_seen_at, hubOnline),
  };
  const level = connectivityLevel(hubConn, airfiConn);

  let liveState: HubState | undefined;
  let stateForMetrics: HubState = hub.state;

  if (airfiConn.check === "live" && airfiConn.online) {
    const airfi = await fetchAirfiState();
    if (airfi) {
      const airfiState = airfiToHubState(airfi);
      const now = new Date().toISOString();
      liveState = { ...hub.state, ...airfiState, airfi_updated_at: now };
      stateForMetrics = liveState;

      const admin = createAdminClient();
      await admin
        .from("hubs")
        .update({ state: liveState })
        .eq("id", hub.id);
    }
  }

  void recordHubMetrics(hub.id, stateForMetrics, hub.control_mode, {
    hub_online: hubOnline,
    airfi_online: airfiConn.online,
  });

  return {
    hub: hubConn,
    airfi: airfiConn,
    online: level === "ok",
    level,
    message: buildOfflineMessage(hubConn, airfiConn),
    live_state: liveState,
    checked_at: new Date().toISOString(),
  };
}
