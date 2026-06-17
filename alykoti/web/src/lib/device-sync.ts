import { canPingAirfiFromRuntime } from "@/lib/airfi-runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAirthingsState } from "@/lib/airthings";
import {
  airfiToHubState,
  applyVentilationControl,
  computeVentilationTargets,
  executeAirfiCommand,
  fetchAirfiState,
  hubStateToAirfiState,
  type AirfiState,
} from "@/lib/airfi";
import { recordHubMetrics } from "@/lib/metric-samples";
import { activeTimedMode, effectiveControlMode, expireTimedModes, formatRemaining, remainingMs } from "@/lib/mode-schedule";
import { getCo2Band, getCo2BandLabel } from "@/lib/ventilation-logic";
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

function targetsToVentilationState(
  targets: { supply: number; exhaust: number; fireplace: boolean },
): HubState {
  return {
    fan_supply_target: targets.supply,
    fan_exhaust_target: targets.exhaust,
    fan_speed_target: targets.supply,
    fireplace_active: targets.fireplace,
    direct_control: true,
  };
}

function modeLabel(mode: HubControlMode, active: ReturnType<typeof activeTimedMode>): string {
  if (active === "fireplace") return "Takka";
  if (active === "hood") return "Liesi";
  if (active === "away") return "Poissa";
  switch (mode) {
    case "manual":
      return "Manuaali";
    case "fireplace":
      return "Takka";
    case "hood":
      return "Liesi";
    default:
      return "Automaatti";
  }
}

function buildSyncDisplay(
  mode: HubControlMode,
  state: HubState,
  config: VentilationConfig,
): { mode: HubControlMode; mode_label: string; timer_text: string | null; co2_band_label: string | null } {
  const s = expireTimedModes(state);
  const active = activeTimedMode(s);

  let timer_text: string | null = null;
  if (active === "fireplace" && s.fireplace_until) {
    timer_text = formatRemaining(remainingMs(s.fireplace_until)!);
  } else if (active === "hood" && s.hood_until) {
    timer_text = formatRemaining(remainingMs(s.hood_until)!);
  } else if (active === "away") {
    timer_text = s.away_unlimited
      ? "rajaton"
      : s.away_until
        ? formatRemaining(remainingMs(s.away_until)!)
        : null;
  }

  return {
    mode,
    mode_label: modeLabel(mode, active),
    timer_text,
    co2_band_label:
      s.co2_ppm != null && Number.isFinite(s.co2_ppm)
        ? getCo2BandLabel(getCo2Band(s.co2_ppm, config))
        : null,
  };
}

export async function syncDevice(
  deviceToken: string,
  body: DeviceSyncRequest,
): Promise<DeviceSyncResponse | null> {
  const supabase = createAdminClient();
  const canPing = canPingAirfiFromRuntime();

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

  const config = parseConfig(hub.config);
  const storedMode = hub.control_mode as HubControlMode;
  let mergedState = expireTimedModes({
    ...parseState(hub.state),
    ...parseState(body.state),
  });

  const hubReportedAirfi = body.state?.airfi_online;
  const hasAirfiTelemetry =
    mergedState.outdoor_temp_c != null ||
    mergedState.exhaust_temp_c != null ||
    mergedState.supply_room_temp_c != null ||
    mergedState.exhaust_hru_temp_c != null ||
    mergedState.fan_supply_pct != null ||
    mergedState.fan_exhaust_pct != null;
  if (hasAirfiTelemetry || hubReportedAirfi === true) {
    mergedState.airfi_online = true;
  } else if (hubReportedAirfi === false) {
    mergedState.airfi_online = false;
  }
  const effectiveMode = effectiveControlMode(storedMode, mergedState);
  let dbControlMode = storedMode;
  if (
    effectiveMode === "auto" &&
    (storedMode === "fireplace" || storedMode === "hood")
  ) {
    dbControlMode = "auto";
  }

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

  let airfiState: AirfiState | null = canPing
    ? await fetchAirfiState()
    : hubStateToAirfiState(mergedState);

  if (!canPing && airfiState) {
    mergedState.airfi_updated_at = new Date().toISOString();
  }

  const { data: pendingCommands } = await supabase
    .from("commands")
    .select("id, command, payload")
    .eq("hub_id", hub.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);

  const commands = pendingCommands ?? [];
  const executedIds: string[] = [];
  const hubCommands: DeviceSyncResponse["commands"] = [];

  for (const cmd of commands) {
    if (canPing) {
      const ok = await executeAirfiCommand(
        cmd.command,
        (cmd.payload ?? {}) as Record<string, unknown>,
      );
      if (ok) executedIds.push(cmd.id);
    } else {
      hubCommands.push({
        id: cmd.id,
        command: cmd.command,
        payload: (cmd.payload ?? {}) as Record<string, unknown>,
      });
    }
  }

  if (hubCommands.length > 0) {
    const deliveredIds = hubCommands.map((c) => c.id);
    await supabase
      .from("commands")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
      })
      .eq("hub_id", hub.id)
      .in("id", deliveredIds)
      .eq("status", "pending");
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

  let ventilationState: HubState | undefined;

  if (
    effectiveMode === "auto" ||
    effectiveMode === "fireplace" ||
    effectiveMode === "hood"
  ) {
    if (canPing) {
      const applied = await applyVentilationControl(
        effectiveMode,
        mergedState.co2_ppm,
        config,
        airfiState,
      );
      if (!airfiState) {
        airfiState = await fetchAirfiState();
      }
      if (applied) {
        ventilationState = targetsToVentilationState(applied);
      }
    } else {
      const targets = computeVentilationTargets(
        effectiveMode,
        mergedState.co2_ppm,
        config,
        airfiState,
      );
      if (targets) {
        ventilationState = targetsToVentilationState(targets);
      }
    }
  }
  if (canPing && airfiState) {
    Object.assign(mergedState, airfiToHubState(airfiState));
    mergedState.airfi_online = true;
    mergedState.airfi_updated_at = new Date().toISOString();
  }

  const hubUpdate: Record<string, unknown> = {
    state: mergedState,
    control_mode: dbControlMode,
    last_seen_at: new Date().toISOString(),
  };  if (body.firmware_version) {
    hubUpdate.firmware_version = body.firmware_version;
  }

  await supabase.from("hubs").update(hubUpdate).eq("id", hub.id);

  void recordHubMetrics(hub.id, mergedState, effectiveMode, {
    hub_online: true,
    airfi_online: mergedState.airfi_online === true,
  });

  return {
    control_mode: effectiveMode,
    config,
    commands: hubCommands,
    sensor: airthingsState ?? undefined,
    ventilation: ventilationState,
    display: buildSyncDisplay(effectiveMode, mergedState, config),
  };
}
