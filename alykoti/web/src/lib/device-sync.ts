import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAirthingsState } from "@/lib/airthings";
import { recordHubMetrics } from "@/lib/metric-samples";
import {
  airfiToHubState,
  applyVentilationControl,
  executeVentilationCommand,
  fetchVentilationState,
} from "@/lib/ventilation";
import { migrateLegacySpeedPct } from "@/lib/ventilation-logic";
import {
  DEFAULT_VENTILATION_CONFIG,
  type DeviceSyncRequest,
  type DeviceSyncResponse,
  type HubControlMode,
  type HubState,
  type VentilationConfig,
} from "@/lib/types";

function parseConfig(raw: unknown): VentilationConfig {
  const base = { ...DEFAULT_VENTILATION_CONFIG };
  if (!raw || typeof raw !== "object") return base;
  const c = raw as Record<string, unknown>;

  const legacyMap: Record<string, keyof VentilationConfig> = {
    speed_normal: "speed_normal_pct",
    speed_elevated: "speed_elevated_pct",
    speed_high: "speed_high_pct",
    speed_max: "speed_max_pct",
    night_max_speed: "night_max_pct",
  };

  for (const [key, value] of Object.entries(c)) {
    if (key === "night_enabled" && typeof value === "boolean") {
      base.night_enabled = value;
      continue;
    }
    const target = (legacyMap[key] ?? key) as keyof VentilationConfig;
    if (!(target in base)) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (target.endsWith("_pct")) {
      (base[target] as number) = migrateLegacySpeedPct(value);
    } else {
      (base[target] as number) = value;
    }
  }
  return base;
}

function parseState(raw: unknown): HubState {
  if (!raw || typeof raw !== "object") return {};
  return raw as HubState;
}

export async function syncDevice(
  deviceToken: string,
  body: DeviceSyncRequest,
): Promise<DeviceSyncResponse | null> {
  const supabase = createAdminClient();

  const { data: hub, error: lookupError } = await supabase
    .from("hubs")
    .select("id, control_mode, config, state")
    .eq("device_token", deviceToken)
    .maybeSingle();

  if (lookupError || !hub) return null;

  const ackedIds = (body.acked_command_ids ?? []).filter(
    (id) => typeof id === "string" && id.length > 0,
  );

  if (ackedIds.length > 0) {
    await supabase
      .from("commands")
      .update({ status: "acked", acked_at: new Date().toISOString() })
      .eq("hub_id", hub.id)
      .in("id", ackedIds)
      .in("status", ["pending", "delivered"]);
  }

  const mergedState: HubState = {
    ...parseState(hub.state),
    ...parseState(body.state),
  };

  const airthingsState = await fetchAirthingsState();
  if (airthingsState) {
    if (airthingsState.co2_ppm != null) mergedState.co2_ppm = airthingsState.co2_ppm;
    if (airthingsState.humidity_pct != null) {
      mergedState.humidity_pct = airthingsState.humidity_pct;
    }
    if (airthingsState.temperature_c != null) {
      mergedState.temperature_c = airthingsState.temperature_c;
    }
    if (airthingsState.tvoc_ppb != null) mergedState.tvoc_ppb = airthingsState.tvoc_ppb;
    if (airthingsState.pm1_ugm3 != null) mergedState.pm1_ugm3 = airthingsState.pm1_ugm3;
    if (airthingsState.pm25_ugm3 != null) mergedState.pm25_ugm3 = airthingsState.pm25_ugm3;
    if (airthingsState.pm10_ugm3 != null) mergedState.pm10_ugm3 = airthingsState.pm10_ugm3;
    mergedState.airthings_source = "cloud";
  }

  const config = parseConfig(hub.config);
  const controlMode = hub.control_mode as HubControlMode;

  let airfiState = await fetchVentilationState();

  const { data: pendingCommands } = await supabase
    .from("commands")
    .select("id, command, payload")
    .eq("hub_id", hub.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);

  const commands = pendingCommands ?? [];
  const executedIds: string[] = [];

  for (const cmd of commands) {
    const ok = await executeVentilationCommand(
      cmd.command,
      (cmd.payload ?? {}) as Record<string, unknown>,
    );
    if (ok) executedIds.push(cmd.id);
  }

  if (executedIds.length > 0) {
    await supabase
      .from("commands")
      .update({
        status: "acked",
        delivered_at: new Date().toISOString(),
        acked_at: new Date().toISOString(),
      })
      .eq("hub_id", hub.id)
      .in("id", executedIds);
  }

  if (controlMode === "auto" || controlMode === "fireplace" || controlMode === "hood") {
    await applyVentilationControl(controlMode, mergedState.co2_ppm, config, airfiState);
    if (!airfiState) {
      airfiState = await fetchVentilationState();
    }
  }

  const ventilationState: HubState | undefined = airfiState
    ? airfiToHubState(airfiState)
    : undefined;

  if (ventilationState) {
    Object.assign(mergedState, ventilationState);
  }

  const hubUpdate: Record<string, unknown> = {
    state: mergedState,
    last_seen_at: new Date().toISOString(),
  };
  if (body.firmware_version) {
    hubUpdate.firmware_version = body.firmware_version;
  }

  await supabase.from("hubs").update(hubUpdate).eq("id", hub.id);

  void recordHubMetrics(hub.id, mergedState, controlMode);

  return {
    control_mode: controlMode,
    config,
    commands: [],
    sensor: airthingsState ?? undefined,
    ventilation: ventilationState,
  };
}
