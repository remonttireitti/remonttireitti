import ModbusRTU from "modbus-serial";
import type { HubControlMode, HubState, VentilationConfig } from "@/lib/types";
import { airfiErrorCodes } from "@/lib/airfi-errors";
import {
  computeLtoEfficiency,
  parseAirfiTempC,
} from "@/lib/lto-efficiency";
import {
  clampFanPct,
  computeAutoFanPct,
  FAN_RAMP_STEP_PCT,
  smoothRampFanPct,
  type AutoFanInputs,
} from "@/lib/ventilation-logic";

const SLAVE_ID = 1;

/** AirFi IV rekisterikartta — sama osoitus kuin HA (input, int16 * 0.1). */
const INPUT = {
  outdoor_temp: 4, // T1 ulkoilma
  exhaust_temp: 6, // T3 poisto
  exhaust_hru_temp: 7, // T4 jateilma
  supply_room_temp: 8, // T5 tulo huoneeseen
  fan_exhaust_pct: 11, // 3x00012 poistopuhaltimen %
  fan_supply_pct: 12, // 3x00013 tulopuhaltimen %
  fireplace_status: 15, // 3x00015 takka/painetasaus
  emergency_stop_status: 17, // 3x00017 Hätäseis-tila (input)
  internal_humidity: 23, // 3x00023
  freezing_alarm: 18, // 3x00018 Jäätymisvaarahälytys
  machine_fault: 19, // 3x00019
  fan_speed_level: 24, // 3x00024
  forced_control: 25, // 3x00025
  direct_control_status: 26, // 3x00026
  direct_fan_pct: 27, // 3x00027
  temp_setpoint_read: 28, // 3x00028 x10°C
  filter_interval: 31, // 3x00031
  error_info: 32, // 3x00032 bitmask E0-E9
  aux2_status: 37, // 3x00038 AUX2 — LTO ohituspelti (tehdas: ulkoilmapellin rele)
  hood_flap_open: 40, // 3x00040 liesikuvun läppä
  supply_airflow_m3h: 45, // 3x00045
  exhaust_airflow_m3h: 46, // 3x00046
} as const;

const HOLDING = {
  speed_level: 0, // 4x00001
  emergency_stop: 1, // 4x00002
  direct_control_enabled: 2, // 4x00003
  direct_combined_pct: 3, // 4x00004
  temp_setpoint: 4, // 4x00005 x10°C
  constant_pressure_mode: 8, // 4x00009 vakiopainesäätö pois
  supply_direct_pct: 10, // 4x00011
  exhaust_direct_pct: 11, // 4x00012
  away_mode: 12, // 4x00013
  away_temp_setpoint: 51, // 4x00052
  sauna_mode: 56, // 4x00057
  fireplace: 57, // 4x00058 Painetasaus/Takka
} as const;

export type AirfiState = {
  supply_fan_pct: number | null;
  exhaust_fan_pct: number | null;
  supply_target_pct: number | null;
  exhaust_target_pct: number | null;
  outdoor_temp_c: number | null;
  supply_hru_temp_c: number | null;
  exhaust_temp_c: number | null;
  supply_room_temp_c: number | null;
  exhaust_hru_temp_c: number | null;
  supply_airflow_m3h: number | null;
  exhaust_airflow_m3h: number | null;
  internal_humidity_pct: number | null;
  lto_temp_efficiency_pct: number | null;
  lto_energy_efficiency_pct: number | null;
  lto_bypass_on: boolean;
  direct_control: boolean;
  fireplace_active: boolean;
  hood_flap_open: boolean;
  emergency_stop: boolean;
  away_mode: boolean;
  freezing_alarm: boolean;
  machine_fault: boolean;
  airfi_errors: string[];
  airfi_error_raw: number | null;
  fan_speed_level: number | null;
  forced_control: number | null;
  temp_setpoint_c: number | null;
  filter_change_per_year: number | null;
  sauna_mode: boolean;
};

function envHost(): string {
  return process.env.AIRFI_MODBUS_HOST ?? "192.168.50.26";
}

function envPort(): number {
  const port = Number(process.env.AIRFI_MODBUS_PORT ?? "502");
  return Number.isFinite(port) ? port : 502;
}

/** Nopea yhteystesti status-pingille (yksi yritys, lyhyt timeout). */
export async function pingAirfiFast(): Promise<boolean> {
  const host = envHost();
  const port = envPort();
  const client = new ModbusRTU();
  client.setTimeout(3000);
  try {
    await client.connectTCP(host, { port });
    client.setID(SLAVE_ID);
    await client.readInputRegisters(INPUT.outdoor_temp, 1);
    return true;
  } catch {
    return false;
  } finally {
    try {
      client.close(() => undefined);
    } catch {
      // ignore
    }
  }
}

async function withClient<T>(fn: (client: ModbusRTU) => Promise<T>): Promise<T | null> {
  const host = envHost();
  const port = envPort();

  for (let attempt = 1; attempt <= 3; attempt++) {
    const client = new ModbusRTU();
    client.setTimeout(5000);
    try {
      await client.connectTCP(host, { port });
      client.setID(SLAVE_ID);
      return await fn(client);
    } catch (error) {
      console.warn(`[airfi] Modbus TCP yritys ${attempt}/3 (${host}:${port}):`, error);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 500));
    } finally {
      try {
        client.close(() => undefined);
      } catch {
        // ignore
      }
    }
  }
  return null;
}

async function readInputBlock(
  client: ModbusRTU,
  address: number,
  length: number,
): Promise<number[] | null> {
  try {
    const result = await client.readInputRegisters(address, length);
    return result.data ?? null;
  } catch (error) {
    console.warn(`[airfi] Input ${address}..${address + length - 1} epaonnistui:`, error);
    return null;
  }
}

async function readHoldingBlock(
  client: ModbusRTU,
  address: number,
  length: number,
): Promise<number[] | null> {
  try {
    const result = await client.readHoldingRegisters(address, length);
    return result.data ?? null;
  } catch (error) {
    console.warn(`[airfi] Holding ${address}..${address + length - 1} epaonnistui:`, error);
    return null;
  }
}

async function readRegister(
  client: ModbusRTU,
  readFn: (address: number, length: number) => Promise<{ data: number[] }>,
  address: number,
): Promise<number | null> {
  try {
    const result = await readFn.call(client, address, 1);
    return result.data[0] ?? null;
  } catch (error) {
    console.warn(`[airfi] Rekisteri ${address} epaonnistui:`, error);
    return null;
  }
}

export async function fetchAirfiState(): Promise<AirfiState | null> {
  return withClient(async (client) => {
    const core = await readInputBlock(client, INPUT.outdoor_temp, 5);
    const status = await readInputBlock(
      client,
      INPUT.emergency_stop_status,
      INPUT.error_info - INPUT.emergency_stop_status + 1,
    );
    const extended = await readInputBlock(
      client,
      INPUT.error_info + 1,
      INPUT.aux2_status - INPUT.error_info,
    );
    const flows = await readInputBlock(client, INPUT.supply_airflow_m3h, 2);
    const hoodFlap = await readRegister(client, client.readInputRegisters, INPUT.hood_flap_open);
    const holdingLow = await readHoldingBlock(
      client,
      HOLDING.emergency_stop,
      HOLDING.away_mode - HOLDING.emergency_stop + 1,
    );
    const holdingExtra = await readHoldingBlock(
      client,
      HOLDING.away_temp_setpoint,
      HOLDING.fireplace - HOLDING.away_temp_setpoint + 1,
    );

    const reg = (block: number[] | null, base: number, addr: number) => {
      if (!block) return null;
      const idx = addr - base;
      return idx >= 0 && idx < block.length ? block[idx] : null;
    };

    const supplyHold = reg(holdingLow, HOLDING.emergency_stop, HOLDING.supply_direct_pct);
    const exhaustHold = reg(holdingLow, HOLDING.emergency_stop, HOLDING.exhaust_direct_pct);
    const supplyInput = await readRegister(client, client.readInputRegisters, INPUT.fan_supply_pct);
    const exhaustInput = await readRegister(client, client.readInputRegisters, INPUT.fan_exhaust_pct);
    const supply = supplyInput ?? supplyHold;
    const exhaust = exhaustInput ?? exhaustHold;
    const outdoor_temp_c = parseAirfiTempC(core?.[0] ?? null);
    const exhaust_temp_c = parseAirfiTempC(core?.[2] ?? null);
    const exhaust_hru_temp_c = parseAirfiTempC(core?.[3] ?? null);
    const supply_room_temp_c = parseAirfiTempC(core?.[4] ?? null);
    const fireplaceStatus = await readRegister(client, client.readInputRegisters, INPUT.fireplace_status);

    const supplyTarget = supplyHold;
    const exhaustTarget = exhaustHold;
    const directControl = reg(holdingLow, HOLDING.emergency_stop, HOLDING.direct_control_enabled);
    const emergency = reg(holdingLow, HOLDING.emergency_stop, HOLDING.emergency_stop);
    const away = reg(holdingLow, HOLDING.emergency_stop, HOLDING.away_mode);
    const fireplaceHold = reg(holdingExtra, HOLDING.away_temp_setpoint, HOLDING.fireplace);
    const saunaHold = reg(holdingExtra, HOLDING.away_temp_setpoint, HOLDING.sauna_mode);
    const tempSetpointHold = reg(holdingLow, HOLDING.emergency_stop, HOLDING.temp_setpoint);

    const statusBase = INPUT.emergency_stop_status;
    const errorRaw = reg(status, statusBase, INPUT.error_info);
    const tempSetpointRead = reg(status, statusBase, INPUT.temp_setpoint_read);
    const fanSpeedLevelRaw =
      reg(status, statusBase, INPUT.fan_speed_level) ??
      (await readRegister(client, client.readHoldingRegisters, HOLDING.speed_level));
    const fanSpeedLevel =
      fanSpeedLevelRaw != null && fanSpeedLevelRaw >= 0 && fanSpeedLevelRaw <= 5
        ? fanSpeedLevelRaw
        : null;
    const humidity = reg(status, statusBase, INPUT.internal_humidity);
    const filterInterval = reg(status, statusBase, INPUT.filter_interval);
    const freezingAlarm = reg(status, statusBase, INPUT.freezing_alarm);
    const machineFault = reg(status, statusBase, INPUT.machine_fault);
    const forcedControl = reg(status, statusBase, INPUT.forced_control);
    const emergencyInput = reg(status, statusBase, INPUT.emergency_stop_status);
    const aux2Status = reg(extended, INPUT.error_info + 1, INPUT.aux2_status);

    const supply_airflow_m3h =
      flows?.[0] != null && flows[0] > 0 ? flows[0] : null;
    const exhaust_airflow_m3h =
      flows?.[1] != null && flows[1] > 0 ? flows[1] : null;

    const lto = computeLtoEfficiency({
      outdoor_c: outdoor_temp_c,
      supply_hru_c: null,
      supply_room_c: supply_room_temp_c,
      exhaust_c: exhaust_temp_c,
      supply_airflow_m3h,
      exhaust_airflow_m3h,
      supply_fan_pct: supply,
      exhaust_fan_pct: exhaust,
    });

    if (
      supply == null &&
      exhaust == null &&
      outdoor_temp_c == null &&
      exhaust_temp_c == null
    ) {
      return null;
    }

    const temp_setpoint_c = parseAirfiTempC(
      tempSetpointRead ?? tempSetpointHold ?? null,
    );

    return {
      supply_fan_pct: supply,
      exhaust_fan_pct: exhaust,
      supply_target_pct: supplyTarget,
      exhaust_target_pct: exhaustTarget,
      outdoor_temp_c,
      supply_hru_temp_c: null,
      exhaust_temp_c,
      supply_room_temp_c,
      exhaust_hru_temp_c,
      supply_airflow_m3h,
      exhaust_airflow_m3h,
      internal_humidity_pct: humidity,
      lto_temp_efficiency_pct: lto.temp_pct,
      lto_energy_efficiency_pct: lto.energy_pct,
      lto_bypass_on: (aux2Status ?? 0) > 0,
      direct_control: (directControl ?? 0) > 0,
      fireplace_active: (fireplaceHold ?? fireplaceStatus ?? 0) > 0,
      hood_flap_open: (hoodFlap ?? 0) > 0,
      emergency_stop: (emergencyInput ?? 0) > 0,
      away_mode: (away ?? 0) > 0,
      freezing_alarm: (freezingAlarm ?? 0) > 0,
      machine_fault: (machineFault ?? 0) > 0,
      airfi_errors: airfiErrorCodes(errorRaw ?? 0),
      airfi_error_raw: errorRaw,
      fan_speed_level: fanSpeedLevel,
      forced_control: forcedControl,
      temp_setpoint_c,
      filter_change_per_year: filterInterval,
      sauna_mode: (saunaHold ?? 0) > 0,
    };
  });
}

export async function setDirectFanPct(
  supplyPct: number,
  exhaustPct: number,
): Promise<boolean> {
  const supply = clampFanPct(supplyPct);
  const exhaust = clampFanPct(exhaustPct);
  const result = await withClient(async (client) => {
    const emergency = await readRegister(client, client.readInputRegisters, INPUT.emergency_stop_status);
    const errorRaw = await readRegister(client, client.readInputRegisters, INPUT.error_info);
    if ((emergency ?? 0) > 0 || ((errorRaw ?? 0) & 2) !== 0) {
      return false;
    }

    // TCP-silta: h2=1 laukaisee usein E1. Vakiopainesäätö (h8=1) + h10/h11 toimii ilman hätäseisiä.
    await client.writeRegister(HOLDING.constant_pressure_mode, 0);
    await client.writeRegister(HOLDING.emergency_stop, 0);
    await client.writeRegister(HOLDING.direct_control_enabled, 0);
    await client.writeRegister(HOLDING.away_mode, 0);
    await client.writeRegister(HOLDING.direct_combined_pct, 0);
    await client.writeRegister(HOLDING.constant_pressure_mode, 1);
    await new Promise((r) => setTimeout(r, 1000));
    await client.writeRegister(HOLDING.supply_direct_pct, supply);
    await client.writeRegister(HOLDING.exhaust_direct_pct, exhaust);
    await new Promise((r) => setTimeout(r, 10000));

    const supplyAfter = await readRegister(client, client.readInputRegisters, INPUT.fan_supply_pct);
    const exhaustAfter = await readRegister(client, client.readInputRegisters, INPUT.fan_exhaust_pct);
    const emergencyAfter = await readRegister(client, client.readInputRegisters, INPUT.emergency_stop_status);
    const errorAfter = await readRegister(client, client.readInputRegisters, INPUT.error_info);
    if ((emergencyAfter ?? 0) > 0 || ((errorAfter ?? 0) & 2) !== 0) {
      return false;
    }
    if (supplyAfter == null || exhaustAfter == null) {
      return false;
    }
    return (
      Math.abs(supplyAfter - supply) < FAN_RAMP_STEP_PCT &&
      Math.abs(exhaustAfter - exhaust) < FAN_RAMP_STEP_PCT
    );
  });
  return result === true;
}

export async function setFireplaceMode(active: boolean): Promise<boolean> {
  const result = await withClient(async (client) => {
    await client.writeRegister(HOLDING.fireplace, active ? 1 : 0);
    return true;
  });
  return result === true;
}

export async function setAirfiAway(away: boolean): Promise<boolean> {
  const result = await withClient(async (client) => {
    await client.writeRegister(HOLDING.away_mode, away ? 1 : 0);
    return true;
  });
  return result === true;
}

export async function setTempSetpoint(tempC: number): Promise<boolean> {
  const raw = Math.max(50, Math.min(260, Math.round(tempC * 10)));
  const result = await withClient(async (client) => {
    await client.writeRegister(HOLDING.temp_setpoint, raw);
    return true;
  });
  return result === true;
}

export async function setSaunaMode(active: boolean): Promise<boolean> {
  const result = await withClient(async (client) => {
    await client.writeRegister(HOLDING.sauna_mode, active ? 1 : 0);
    return true;
  });
  return result === true;
}

export async function ackAirfiAlarms(): Promise<boolean> {
  const result = await withClient(async (client) => {
    await client.writeRegister(HOLDING.constant_pressure_mode, 0);
    await client.writeRegister(HOLDING.emergency_stop, 0);
    await client.writeRegister(HOLDING.direct_control_enabled, 0);
    await client.writeRegister(HOLDING.away_mode, 0);
    return true;
  });
  return result === true;
}

export async function setFanSpeedLevel(level: number): Promise<boolean> {
  // 4x00001 (h0) ei ole kirjoitettavissa TCP:llä tällä koneella.
  console.warn("[airfi] Nopeustason Modbus-kirjoitus ohitettu (h0 ei tuettu)", level);
  return false;
}

function targetsMatch(
  airfi: AirfiState,
  supply: number,
  exhaust: number,
): boolean {
  const actualSupply = airfi.supply_fan_pct;
  const actualExhaust = airfi.exhaust_fan_pct;
  if (actualSupply == null || actualExhaust == null) return false;
  return (
    Math.abs(actualSupply - supply) < FAN_RAMP_STEP_PCT &&
    Math.abs(actualExhaust - exhaust) < FAN_RAMP_STEP_PCT
  );
}

export type VentilationTargets = {
  /** Seuraava Modbus-kirjoitus (rampattu). */
  supply: number;
  exhaust: number;
  fireplace: boolean;
  /** Täysi automaattitavoite näyttöä varten (ennen rampausta). */
  displaySupply: number;
  displayExhaust: number;
  needsWrite: boolean;
};

export function hubStateToAirfiState(state: HubState): AirfiState | null {
  if (
    state.fan_supply_pct == null &&
    state.fan_exhaust_pct == null &&
    state.outdoor_temp_c == null &&
    state.exhaust_temp_c == null
  ) {
    return null;
  }

  return {
    supply_fan_pct: state.fan_supply_pct ?? null,
    exhaust_fan_pct: state.fan_exhaust_pct ?? null,
    supply_target_pct: state.fan_supply_target ?? null,
    exhaust_target_pct: state.fan_exhaust_target ?? null,
    outdoor_temp_c: state.outdoor_temp_c ?? null,
    supply_hru_temp_c: state.supply_hru_temp_c ?? null,
    exhaust_temp_c: state.exhaust_temp_c ?? null,
    supply_room_temp_c: state.supply_room_temp_c ?? null,
    exhaust_hru_temp_c: state.exhaust_hru_temp_c ?? null,
    supply_airflow_m3h: state.supply_airflow_m3h ?? null,
    exhaust_airflow_m3h: state.exhaust_airflow_m3h ?? null,
    internal_humidity_pct: state.humidity_pct ?? null,
    lto_temp_efficiency_pct: state.lto_temp_efficiency_pct ?? null,
    lto_energy_efficiency_pct: state.lto_energy_efficiency_pct ?? null,
    lto_bypass_on: state.lto_bypass_on ?? false,
    direct_control: state.direct_control ?? false,
    fireplace_active: state.fireplace_active ?? false,
    hood_flap_open: state.hood_active ?? false,
    emergency_stop: state.emergency_stop ?? false,
    away_mode: state.away_mode ?? false,
    freezing_alarm: state.freezing_alarm ?? false,
    machine_fault: state.machine_fault ?? false,
    airfi_errors: state.airfi_errors ?? [],
    airfi_error_raw: state.airfi_error_raw ?? null,
    fan_speed_level: state.fan_speed_level ?? null,
    forced_control: state.forced_control ?? null,
    temp_setpoint_c: state.temp_setpoint_c ?? null,
    filter_change_per_year: state.filter_change_per_year ?? null,
    sauna_mode: state.sauna_mode ?? false,
  };
}

export function computeVentilationTargets(
  controlMode: HubControlMode,
  inputs: AutoFanInputs,
  config: VentilationConfig,
  airfi: AirfiState | null,
): VentilationTargets | null {
  if (!airfi || airfi.emergency_stop || airfi.away_mode) return null;
  if (airfi.machine_fault || airfi.freezing_alarm) return null;

  let supply: number;
  let exhaust: number;
  let fireplace = false;

  switch (controlMode) {
    case "hood":
      supply = config.hood_supply_pct;
      exhaust = config.hood_exhaust_pct;
      break;
    case "fireplace":
      supply = config.fireplace_supply_pct;
      exhaust = config.fireplace_exhaust_pct;
      fireplace = true;
      break;
    case "manual":
      return null;
    case "auto":
    default: {
      const fanInputs: AutoFanInputs = {
        ...inputs,
        outdoorTempC: inputs.outdoorTempC ?? airfi.outdoor_temp_c,
      };
      const pct = computeAutoFanPct(fanInputs, config);
      if (pct == null) return null;
      supply = pct;
      exhaust = pct;
      break;
    }
  }

  const displaySupply = clampFanPct(supply);
  const displayExhaust = clampFanPct(exhaust);
  const writeSupply = clampFanPct(smoothRampFanPct(airfi.supply_fan_pct, displaySupply));
  const writeExhaust = clampFanPct(smoothRampFanPct(airfi.exhaust_fan_pct, displayExhaust));

  const needsWrite =
    !targetsMatch(airfi, writeSupply, writeExhaust) ||
    airfi.fireplace_active !== fireplace ||
    Math.abs((airfi.supply_fan_pct ?? 0) - displaySupply) > FAN_RAMP_STEP_PCT ||
    Math.abs((airfi.exhaust_fan_pct ?? 0) - displayExhaust) > FAN_RAMP_STEP_PCT;

  return {
    supply: writeSupply,
    exhaust: writeExhaust,
    fireplace,
    displaySupply,
    displayExhaust,
    needsWrite,
  };
}

export async function applyVentilationControl(
  controlMode: HubControlMode,
  inputs: AutoFanInputs,
  config: VentilationConfig,
  airfi: AirfiState | null,
  options?: { write?: boolean },
): Promise<VentilationTargets | null> {
  const targets = computeVentilationTargets(controlMode, inputs, config, airfi);
  if (!targets || !targets.needsWrite) return targets;
  if (options?.write === false) return targets;

  if (targets.fireplace) await setFireplaceMode(true);
  else if (airfi?.fireplace_active) await setFireplaceMode(false);

  const ok = await setDirectFanPct(targets.supply, targets.exhaust);
  return ok ? targets : null;
}

export function airfiToHubState(airfi: AirfiState): Partial<HubState> {
  return {
    fan_supply_pct: airfi.supply_fan_pct,
    fan_exhaust_pct: airfi.exhaust_fan_pct,
    fan_supply_target: airfi.supply_target_pct,
    fan_exhaust_target: airfi.exhaust_target_pct,
    outdoor_temp_c: airfi.outdoor_temp_c,
    supply_hru_temp_c: airfi.supply_hru_temp_c,
    exhaust_temp_c: airfi.exhaust_temp_c,
    supply_room_temp_c: airfi.supply_room_temp_c,
    exhaust_hru_temp_c: airfi.exhaust_hru_temp_c,
    supply_airflow_m3h: airfi.supply_airflow_m3h,
    exhaust_airflow_m3h: airfi.exhaust_airflow_m3h,
    lto_temp_efficiency_pct: airfi.lto_temp_efficiency_pct,
    lto_energy_efficiency_pct: airfi.lto_energy_efficiency_pct,
    lto_bypass_on: airfi.lto_bypass_on,
    fan_speed: airfi.supply_fan_pct,
    fan_speed_target: airfi.supply_target_pct,
    direct_control: airfi.direct_control,
    fireplace_active: airfi.fireplace_active,
    hood_active: airfi.hood_flap_open,
    away_mode: airfi.away_mode,
    emergency_stop: airfi.emergency_stop,
    freezing_alarm: airfi.freezing_alarm,
    machine_fault: airfi.machine_fault,
    airfi_errors: airfi.airfi_errors,
    airfi_error_raw: airfi.airfi_error_raw,
    fan_speed_level: airfi.fan_speed_level,
    forced_control: airfi.forced_control,
    temp_setpoint_c: airfi.temp_setpoint_c,
    filter_change_per_year: airfi.filter_change_per_year,
    sauna_mode: airfi.sauna_mode,
    humidity_pct: airfi.internal_humidity_pct,
    fault:
      airfi.machine_fault ||
      airfi.freezing_alarm ||
      airfi.airfi_errors.length > 0,
  };
}

export async function executeAirfiCommand(
  command: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  if (command === "set_fan_pct") {
    const supply = typeof payload.supply_pct === "number" ? payload.supply_pct : null;
    const exhaust = typeof payload.exhaust_pct === "number" ? payload.exhaust_pct : null;
    if (supply == null || exhaust == null) return false;
    if (payload.fireplace === true) await setFireplaceMode(true);
    else if (payload.fireplace === false) await setFireplaceMode(false);
    return setDirectFanPct(supply, exhaust);
  }
  if (command === "set_away" && typeof payload.away === "boolean") {
    return setAirfiAway(payload.away);
  }
  if (command === "set_temp_setpoint" && typeof payload.temp_c === "number") {
    return setTempSetpoint(payload.temp_c);
  }
  if (command === "set_sauna_mode" && typeof payload.active === "boolean") {
    return setSaunaMode(payload.active);
  }
  if (command === "ack_airfi_alarms") {
    return ackAirfiAlarms();
  }
  if (command === "set_fireplace_mode" && typeof payload.active === "boolean") {
    return setFireplaceMode(payload.active);
  }
  if (command === "set_fan_speed_level" && typeof payload.level === "number") {
    return setFanSpeedLevel(payload.level);
  }
  if (command === "set_mode") {
    return true;
  }
  return false;
}
