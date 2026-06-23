import { canPingAirfiFromRuntime } from "@/lib/airfi-runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAirthingsState } from "@/lib/airthings";
import { hasAirfiTelemetry } from "@/lib/airfi-telemetry";
import { normalizeAutomationRules } from "@/lib/automation";
import { repairSaunaShowerMirrorRules } from "@/lib/automation-presets";
import {
  airfiToHubState,
  applyVentilationControl,
  computeVentilationTargets,
  executeAirfiCommand,
  fetchAirfiState,
  hubStateToAirfiState,
  type AirfiState,
} from "@/lib/airfi";
import { recordEnergySamples } from "@/lib/energy-samples";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import { recordHubMetrics } from "@/lib/metric-samples";
import { activeTimedMode, effectiveControlMode, expireTimedModes, formatRemaining, remainingMs } from "@/lib/mode-schedule";
import { getCo2Band, getCo2BandLabel, collectVentilationHumidityPct, type AutoFanInputs } from "@/lib/ventilation-logic";
import { enrichLtoFromHubState } from "@/lib/lto-efficiency";
import { normalizeAutomationEvents } from "@/lib/automation-events";
import { parseHubConfig } from "@/lib/hubs";
import {
  type DeviceSyncRequest,
  type DeviceSyncResponse,
  type HubControlMode,
  type HubIntegrations,
  type HubState,
  type VentilationConfig,
} from "@/lib/types";

function parseState(raw: unknown): HubState {
  if (!raw || typeof raw !== "object") return {};
  return raw as HubState;
}

function targetsToVentilationState(
  targets: {
    supply: number;
    exhaust: number;
    fireplace: boolean;
    displaySupply?: number;
    displayExhaust?: number;
  },
): HubState {
  return {
    fan_supply_target: targets.displaySupply ?? targets.supply,
    fan_exhaust_target: targets.displayExhaust ?? targets.exhaust,
    fan_speed_target: targets.displaySupply ?? targets.supply,
    fireplace_active: targets.fireplace,
    direct_control: true,
  };
}

function ventilationWritePayload(
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
  const canPing = body.quick ? false : canPingAirfiFromRuntime();
  const quick = body.quick === true;

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

  const failedCommands = (body.failed_commands ?? []).filter(
    (row): row is { id: string; message?: string } =>
      typeof row === "object" &&
      row != null &&
      typeof (row as { id?: unknown }).id === "string" &&
      (row as { id: string }).id.length > 0,
  );

  for (const row of failedCommands) {
    await supabase
      .from("commands")
      .update({
        status: "failed",
        error_message: row.message?.trim() || "Ohjaus epäonnistui",
      })
      .eq("hub_id", hub.id)
      .eq("id", row.id)
      .in("status", ["pending", "delivered"]);
  }

  const commandStaleBefore = new Date(Date.now() - 15 * 60_000).toISOString();
  await supabase
    .from("commands")
    .update({
      status: "failed",
      error_message: "Keskusyksikkö ei vahvistanut komentoa ajoissa",
    })
    .eq("hub_id", hub.id)
    .eq("status", "delivered")
    .lt("delivered_at", commandStaleBefore);

  let config = parseHubConfig(hub.config);
  const storedMode = hub.control_mode as HubControlMode;
  let mergedState = expireTimedModes({
    ...parseState(hub.state),
    ...parseState(body.state),
  });

  const AIRFI_TEMP_KEYS = [
    "outdoor_temp_c",
    "exhaust_temp_c",
    "supply_room_temp_c",
    "exhaust_hru_temp_c",
  ] as const;

  const AIRFI_FAN_KEYS = ["fan_supply_pct", "fan_exhaust_pct", "lto_temp_efficiency_pct"] as const;

  const AIRFI_STATUS_KEYS = [
    "airfi_errors",
    "airfi_error_raw",
    "freezing_alarm",
    "machine_fault",
    "fan_speed_level",
    "temp_setpoint_c",
    "filter_change_per_year",
    "sauna_mode",
    "forced_control",
    "emergency_stop",
    "airfi_modbus_pause_until",
    "humidity_pct",
    "fault",
  ] as const;

  if (body.state?.lights && typeof body.state.lights === "object") {
    mergedState.lights = body.state.lights;
  }

  if (body.state?.home_devices && typeof body.state.home_devices === "object") {
    mergedState.home_devices = body.state.home_devices;
  }

  if (Array.isArray(body.state?.automation_events)) {
    mergedState.automation_events = normalizeAutomationEvents(body.state.automation_events);
  }

  if (body.state?.device_live_events && typeof body.state.device_live_events === "object") {
    mergedState.device_live_events = body.state.device_live_events as HubState["device_live_events"];
  }

  const airthingsState = quick ? null : await fetchAirthingsState();
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

  if (!quick) {
    if (Array.isArray(body.state?.tasmota_discovered)) {
      mergedState.tasmota_discovered = body.state.tasmota_discovered as HubState["tasmota_discovered"];
    }

    if (Array.isArray(body.state?.shelly_discovered)) {
      mergedState.shelly_discovered = body.state.shelly_discovered as HubState["shelly_discovered"];
    }

    if (body.state?.zwave_nodes && typeof body.state.zwave_nodes === "object") {
      mergedState.zwave_nodes = body.state.zwave_nodes as HubState["zwave_nodes"];
    }
  }

  const prevStored = parseState(hub.state);
  const prevOverrides = prevStored.device_overrides;
  if (prevOverrides && typeof prevOverrides === "object") {
    mergedState.device_overrides = prevOverrides;
  }

  const prevFloorPins = prevStored.floor_plan_pins;
  if (Array.isArray(prevFloorPins)) {
    mergedState.floor_plan_pins = prevFloorPins;
  }

  const prevIntegrations = prevStored.integrations;
  if (prevIntegrations && typeof prevIntegrations === "object") {
    mergedState.integrations = prevIntegrations;
  }

  if (!quick) {
    mergedState.home_devices = normalizeHomeDevices(mergedState.home_devices, {
      integrations: mergedState.integrations,
      airthingsState,
    });
  }

  const prevAutomations = prevStored.automations;
  if (Array.isArray(prevAutomations) && !config.automations?.length) {
    mergedState.automations = prevAutomations;
  }

  if (body.state && typeof body.state === "object" && "airfi_online" in body.state) {
    const incoming = body.state as Record<string, unknown>;
    for (const key of AIRFI_TEMP_KEYS) {
      if (key in incoming) {
        const v = incoming[key];
        (mergedState as Record<string, unknown>)[key] =
          typeof v === "number" && Number.isFinite(v) ? v : null;
      }
    }
    for (const key of AIRFI_FAN_KEYS) {
      if (key in incoming) {
        const v = incoming[key];
        if (typeof v === "number" && Number.isFinite(v)) {
          (mergedState as Record<string, unknown>)[key] = v;
        }
      }
    }
    for (const key of AIRFI_STATUS_KEYS) {
      if (!(key in incoming)) continue;
      const v = incoming[key];
      if (key === "airfi_errors" && Array.isArray(v)) {
        mergedState.airfi_errors = v.filter((c) => typeof c === "string");
        continue;
      }
      if (key === "airfi_error_raw") {
        mergedState.airfi_error_raw =
          typeof v === "number" && Number.isFinite(v) ? v : null;
        continue;
      }
      if (key === "fan_speed_level" || key === "forced_control" || key === "filter_change_per_year") {
        (mergedState as Record<string, unknown>)[key] =
          typeof v === "number" && Number.isFinite(v) ? v : null;
        continue;
      }
      if (key === "temp_setpoint_c") {
        mergedState.temp_setpoint_c =
          typeof v === "number" && Number.isFinite(v) ? v : null;
        continue;
      }
      if (key === "airfi_modbus_pause_until") {
        mergedState.airfi_modbus_pause_until =
          typeof v === "string" && v.trim() ? v.trim() : undefined;
        continue;
      }
      if (
        key === "freezing_alarm" ||
        key === "machine_fault" ||
        key === "sauna_mode" ||
        key === "emergency_stop" ||
        key === "fault"
      ) {
        (mergedState as Record<string, unknown>)[key] = v === true;
        continue;
      }
      if (key === "humidity_pct") {
        mergedState.humidity_pct =
          typeof v === "number" && Number.isFinite(v) ? v : null;
      }
    }
  }

  const hubReportedAirfi = body.state?.airfi_online;
  if (hasAirfiTelemetry(mergedState) || hubReportedAirfi === true) {
    mergedState.airfi_online = true;
    mergedState.airfi_updated_at = new Date().toISOString();
  } else if (hubReportedAirfi === false) {
    const prev = parseState(hub.state);
    const prevAt = prev.airfi_updated_at;
    const grace =
      prev.airfi_online === true &&
      prevAt != null &&
      Date.now() - new Date(prevAt).getTime() < 10 * 60_000;
    mergedState.airfi_online = grace || hasAirfiTelemetry(prev);
    if (mergedState.airfi_online) {
      mergedState.airfi_updated_at = new Date().toISOString();
    }
  }
  const effectiveMode = effectiveControlMode(storedMode, mergedState);
  let dbControlMode = storedMode;
  if (
    effectiveMode === "auto" &&
    (storedMode === "fireplace" || storedMode === "hood")
  ) {
    dbControlMode = "auto";
  }

  let airfiState: AirfiState | null = canPing
    ? await fetchAirfiState()
    : hubStateToAirfiState(mergedState);

  if (!canPing && airfiState) {
    mergedState.airfi_updated_at = new Date().toISOString();
  }

  const commandRetryAfter = new Date(Date.now() - 15 * 60_000).toISOString();

  const [{ data: pendingCommands }, { data: retryCommands }] = await Promise.all([
    supabase
      .from("commands")
      .select("id, command, payload")
      .eq("hub_id", hub.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10),
    supabase
      .from("commands")
      .select("id, command, payload")
      .eq("hub_id", hub.id)
      .eq("status", "delivered")
      .gte("delivered_at", commandRetryAfter)
      .order("created_at", { ascending: true })
      .limit(10),
  ]);

  const pending = pendingCommands ?? [];
  const retry = retryCommands ?? [];
  const maxBatch = 10;
  const pendingBatch = pending.slice(0, maxBatch);
  const retryBatch = retry.slice(0, Math.max(0, maxBatch - pendingBatch.length));
  const commands = [...pendingBatch, ...retryBatch];
  const executedIds: string[] = [];
  const hubCommands: DeviceSyncResponse["commands"] = [];

  /** Vain nämä voidaan suorittaa suoraan Vercelissä kun LAN-AirFi on tavoitettavissa. */
  const airfiServerCommands = new Set([
    "set_fan_pct",
    "set_away",
    "set_temp_setpoint",
    "set_sauna_mode",
    "ack_airfi_alarms",
    "set_fireplace_mode",
    "set_fan_speed_level",
    "set_mode",
  ]);

  for (const cmd of commands) {
    if (canPing && airfiServerCommands.has(cmd.command)) {
      const ok = await executeAirfiCommand(
        cmd.command,
        (cmd.payload ?? {}) as Record<string, unknown>,
      );
      if (ok) {
        executedIds.push(cmd.id);
      } else {
        await supabase
          .from("commands")
          .update({
            status: "failed",
            error_message: "AirFi-ohjaus epäonnistui",
          })
          .eq("hub_id", hub.id)
          .eq("id", cmd.id)
          .in("status", ["pending", "delivered"]);
      }
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

  let ventilationDisplay: HubState | undefined;
  let ventilationWrite: HubState | undefined;

  const ventilationHumidity = collectVentilationHumidityPct({
    homeDevices: mergedState.home_devices,
    airthingsHumidity: airthingsState?.humidity_pct,
    airfiHumidity: airfiState?.internal_humidity_pct ?? mergedState.humidity_pct,
  });
  if (ventilationHumidity != null) {
    mergedState.ventilation_humidity_pct = ventilationHumidity;
  }

  const fanInputs: AutoFanInputs = {
    co2: mergedState.co2_ppm,
    pm25: mergedState.pm25_ugm3,
    humidity: ventilationHumidity,
    indoorTempC: mergedState.temperature_c,
    outdoorTempC: mergedState.outdoor_temp_c,
  };

  const hubHasRealAirfi =
    mergedState.airfi_online === true && hasAirfiTelemetry(mergedState);

  const airfiWritesPaused =
    typeof mergedState.airfi_modbus_pause_until === "string" &&
    Number.isFinite(Date.parse(mergedState.airfi_modbus_pause_until)) &&
    Date.now() < Date.parse(mergedState.airfi_modbus_pause_until);

  if (
    effectiveMode === "auto" ||
    effectiveMode === "fireplace" ||
    effectiveMode === "hood"
  ) {
    if (airfiWritesPaused) {
      // Yellow kuittauksen jälkeinen tauko — älä lähetä tuuletuskirjoituksia.
    } else if (canPing) {
      const applied = await applyVentilationControl(
        effectiveMode,
        fanInputs,
        config,
        airfiState,
      );
      if (!airfiState) {
        airfiState = await fetchAirfiState();
      }
      if (applied) {
        ventilationDisplay = targetsToVentilationState(applied);
        if (applied.needsWrite) {
          ventilationWrite = ventilationWritePayload(applied);
        }
      }
    } else if (hubHasRealAirfi) {
      const targets = computeVentilationTargets(
        effectiveMode,
        fanInputs,
        config,
        airfiState,
      );
      if (targets) {
        ventilationDisplay = targetsToVentilationState(targets);
        if (targets.needsWrite) {
          ventilationWrite = ventilationWritePayload(targets);
        }
      }
    }
  }
  if (canPing && airfiState) {
    Object.assign(mergedState, airfiToHubState(airfiState));
    mergedState.airfi_online = true;
    mergedState.airfi_updated_at = new Date().toISOString();
  }

  if (ventilationDisplay) {
    mergedState.fan_supply_target = ventilationDisplay.fan_supply_target;
    mergedState.fan_exhaust_target = ventilationDisplay.fan_exhaust_target;
    mergedState.fan_speed_target = ventilationDisplay.fan_speed_target;
    if (ventilationDisplay.fireplace_active != null) {
      mergedState.fireplace_active = ventilationDisplay.fireplace_active;
    }
    if (ventilationDisplay.direct_control != null) {
      mergedState.direct_control = ventilationDisplay.direct_control;
    }
  } else if (effectiveMode === "manual") {
    const pendingFan = commands.find((c) => c.command === "set_fan_pct");
    if (pendingFan?.payload) {
      const s = pendingFan.payload.supply_pct;
      const e = pendingFan.payload.exhaust_pct;
      if (typeof s === "number" && Number.isFinite(s)) {
        mergedState.fan_supply_target = Math.round(s);
      }
      if (typeof e === "number" && Number.isFinite(e)) {
        mergedState.fan_exhaust_target = Math.round(e);
      }
    }
  }

  const lto = enrichLtoFromHubState(mergedState);
  mergedState.lto_temp_efficiency_pct = lto.lto_temp_efficiency_pct;
  mergedState.lto_energy_efficiency_pct = lto.lto_energy_efficiency_pct;

  const hubUpdate: Record<string, unknown> = {
    state: mergedState,
    control_mode: dbControlMode,
    last_seen_at: new Date().toISOString(),
  };
  if (body.firmware_version) {
    hubUpdate.firmware_version = body.firmware_version;
  }

  await supabase.from("hubs").update(hubUpdate).eq("id", hub.id);

  if (!quick) {
    void recordHubMetrics(hub.id, mergedState, effectiveMode, {
      hub_online: true,
      airfi_online: mergedState.airfi_online === true,
    });
    void recordEnergySamples(hub.id, mergedState.home_devices);
  }

  const integrations: HubIntegrations | undefined =
    mergedState.integrations && typeof mergedState.integrations === "object"
      ? mergedState.integrations
      : undefined;

  let automations =
    config.automations?.length
      ? config.automations
      : normalizeAutomationRules(mergedState.automations);
  const repaired = repairSaunaShowerMirrorRules(automations);
  const automationsChanged = JSON.stringify(repaired) !== JSON.stringify(automations);
  if (!quick && automationsChanged && config.automations?.length) {
    config = { ...config, automations: repaired };
    await supabase.from("hubs").update({ config }).eq("id", hub.id);
  }
  automations = repaired;

  return {
    control_mode: effectiveMode,
    config,
    commands: hubCommands,
    sensor: airthingsState ?? undefined,
    ventilation: ventilationWrite,
    display: buildSyncDisplay(effectiveMode, mergedState, config),
    integrations,
    automations,
  };
}
