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
import { effectiveControlMode, expireTimedModes } from "@/lib/mode-schedule";
import { recordHubMetrics } from "@/lib/metric-samples";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { SupabaseClient } from "@supabase/supabase-js";

async function resolveAirfiConnectivity(
  hubOnline: boolean,
  airfiOnlineFromHub: boolean | null | undefined,
  state?: { outdoor_temp_c?: number | null; exhaust_temp_c?: number | null; supply_room_temp_c?: number | null; exhaust_hru_temp_c?: number | null; fan_supply_pct?: number | null; fan_exhaust_pct?: number | null },
): Promise<AirfiConnectivity> {
  if (canPingAirfiFromRuntime()) {
    return { online: await pingAirfiFast(), source: "local_modbus" };
  }

  const hasTelemetry =
    state?.outdoor_temp_c != null ||
    state?.exhaust_temp_c != null ||
    state?.supply_room_temp_c != null ||
    state?.exhaust_hru_temp_c != null ||
    state?.fan_supply_pct != null ||
    state?.fan_exhaust_pct != null;

  return {
    online: hubOnline && (airfiOnlineFromHub === true || hasTelemetry),
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
    hub.state,
  );
  const level = connectivityLevel(hubConn, airfiConn);
  const state = expireTimedModes(hub.state);
  const effectiveMode = effectiveControlMode(hub.control_mode, state);

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
    live: {
      control_mode: effectiveMode,
      fan_supply_pct: state.fan_supply_pct ?? null,
      fan_exhaust_pct: state.fan_exhaust_pct ?? null,
      fan_supply_target: state.fan_supply_target ?? null,
      fan_exhaust_target: state.fan_exhaust_target ?? null,
      fireplace_until: state.fireplace_until ?? null,
      hood_until: state.hood_until ?? null,
      away_until: state.away_until ?? null,
      away_unlimited: state.away_unlimited ?? false,
      away_mode: state.away_mode ?? false,
    },
  };
}
