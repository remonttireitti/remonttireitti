import { canPingAirfiFromRuntime } from "@/lib/airfi-runtime";
import { pingAirfiFast } from "@/lib/airfi";
import { inferAirfiOnline } from "@/lib/airfi-telemetry";
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
import { enrichLtoFromHubState } from "@/lib/lto-efficiency";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { HubState } from "@/lib/types";

async function resolveAirfiConnectivity(
  hubOnline: boolean,
  airfiOnlineFromHub: boolean | null | undefined,
  state?: Partial<HubState>,
  hubLastSeenAt?: string | null,
): Promise<AirfiConnectivity> {
  if (canPingAirfiFromRuntime()) {
    return { online: await pingAirfiFast(), source: "local_modbus" };
  }

  return {
    online: inferAirfiOnline(
      hubOnline,
      state,
      airfiOnlineFromHub,
      hubLastSeenAt,
    ),
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
    hub.last_seen_at,
  );
  const level = connectivityLevel(hubConn, airfiConn);
  const state = expireTimedModes(hub.state);
  const lto = enrichLtoFromHubState(state);
  state.lto_temp_efficiency_pct = lto.lto_temp_efficiency_pct;
  state.lto_energy_efficiency_pct = lto.lto_energy_efficiency_pct;
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
      lto_temp_efficiency_pct: state.lto_temp_efficiency_pct ?? null,
      lto_energy_efficiency_pct: state.lto_energy_efficiency_pct ?? null,
      fireplace_until: state.fireplace_until ?? null,
      hood_until: state.hood_until ?? null,
      away_until: state.away_until ?? null,
      away_unlimited: state.away_unlimited ?? false,
      away_mode: state.away_mode ?? false,
      emergency_stop: state.emergency_stop ?? false,
      freezing_alarm: state.freezing_alarm ?? false,
      machine_fault: state.machine_fault ?? false,
      airfi_error_raw: state.airfi_error_raw ?? null,
      airfi_errors: state.airfi_errors ?? [],
      fan_speed_level: state.fan_speed_level ?? null,
      temp_setpoint_c: state.temp_setpoint_c ?? null,
      filter_change_per_year: state.filter_change_per_year ?? null,
      sauna_mode: state.sauna_mode ?? false,
      fireplace_active: state.fireplace_active ?? false,
      outdoor_temp_c: state.outdoor_temp_c ?? null,
      exhaust_temp_c: state.exhaust_temp_c ?? null,
      supply_room_temp_c: state.supply_room_temp_c ?? null,
    },
  };
}
