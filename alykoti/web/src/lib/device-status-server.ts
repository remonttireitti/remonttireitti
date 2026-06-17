import { createAdminClient } from "@/lib/supabase/admin";
import { airfiToHubState, fetchAirfiState, pingAirfiFast } from "@/lib/airfi";
import {
  buildOfflineMessage,
  connectivityLevel,
  hubLastSeenLabel,
  isHubOnline,
  type DeviceStatus,
} from "@/lib/device-status";
import { recordHubMetrics } from "@/lib/metric-samples";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HubState } from "@/lib/types";

export async function getDeviceStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<DeviceStatus | null> {
  const hub = await fetchPrimaryHub(supabase, userId);
  if (!hub) return null;

  const airfiOnline = await pingAirfiFast();
  const hubOnline = isHubOnline(hub.last_seen_at);
  const hubConn = {
    online: hubOnline,
    last_seen_at: hub.last_seen_at,
    last_seen_label: hubLastSeenLabel(hub.last_seen_at, hubOnline),
  };
  const airfiConn = { online: airfiOnline };
  const level = connectivityLevel(hubConn, airfiConn);

  let liveState: HubState | undefined;
  let stateForMetrics: HubState = hub.state;

  if (airfiOnline) {
    const airfi = await fetchAirfiState();
    if (airfi) {
      const airfiState = airfiToHubState(airfi);
      liveState = { ...hub.state, ...airfiState };
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
    airfi_online: airfiOnline,
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
