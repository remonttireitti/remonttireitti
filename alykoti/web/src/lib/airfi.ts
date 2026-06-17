import ModbusRTU from "modbus-serial";
import type { HubControlMode, HubState, VentilationConfig } from "@/lib/types";
import {
  computeLtoEfficiency,
  parseAirfiTempC,
} from "@/lib/lto-efficiency";
import {
  clampFanPct,
  computeAutoFanPct,
} from "@/lib/ventilation-logic";

const SLAVE_ID = 1;

/** AirFi IV rekisterikartta v2.9 — osoitteet 0-pohjaiset (modbus-serial). */
const INPUT = {
  outdoor_temp: 3,
  supply_hru_temp: 4,
  exhaust_temp: 5,
  supply_room_temp: 6,
  exhaust_hru_temp: 7,
  exhaust_fan_pct: 11,
  supply_fan_pct: 12,
  internal_humidity: 22,
  fireplace_status: 15,
  hood_flap_open: 40,
  supply_airflow_m3h: 44,
  exhaust_airflow_m3h: 45,
} as const;

const HOLDING = {
  speed_level: 1,
  emergency_stop: 2,
  direct_control_enabled: 3,
  supply_direct_pct: 10,
  exhaust_direct_pct: 11,
  away_mode: 12,
  fireplace: 58,
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
  direct_control: boolean;
  fireplace_active: boolean;
  hood_flap_open: boolean;
  emergency_stop: boolean;
  away_mode: boolean;
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
    const core = await readInputBlock(client, INPUT.outdoor_temp, 10);
    const flows = await readInputBlock(client, INPUT.supply_airflow_m3h, 2);
    const hoodFlap = await readRegister(client, client.readInputRegisters, INPUT.hood_flap_open);
    const humidity = core?.[INPUT.internal_humidity - INPUT.outdoor_temp] ?? null;
    const supplyTarget = await readRegister(client, client.readHoldingRegisters, HOLDING.supply_direct_pct);
    const exhaustTarget = await readRegister(client, client.readHoldingRegisters, HOLDING.exhaust_direct_pct);
    const directControl = await readRegister(client, client.readHoldingRegisters, HOLDING.direct_control_enabled);
    const fireplaceHold = await readRegister(client, client.readHoldingRegisters, HOLDING.fireplace);
    const emergency = await readRegister(client, client.readHoldingRegisters, HOLDING.emergency_stop);
    const away = await readRegister(client, client.readHoldingRegisters, HOLDING.away_mode);

    const supply = core?.[INPUT.supply_fan_pct - INPUT.outdoor_temp] ?? null;
    const exhaust = core?.[INPUT.exhaust_fan_pct - INPUT.outdoor_temp] ?? null;
    const outdoor_temp_c = parseAirfiTempC(core?.[0] ?? null);
    const supply_hru_temp_c = parseAirfiTempC(core?.[1] ?? null);
    const exhaust_temp_c = parseAirfiTempC(core?.[2] ?? null);
    const supply_room_temp_c = parseAirfiTempC(core?.[3] ?? null);
    const exhaust_hru_temp_c = parseAirfiTempC(core?.[4] ?? null);
    const fireplaceStatus = core?.[INPUT.fireplace_status - INPUT.outdoor_temp] ?? null;

    const supply_airflow_m3h =
      flows?.[0] != null && flows[0] > 0 ? flows[0] : null;
    const exhaust_airflow_m3h =
      flows?.[1] != null && flows[1] > 0 ? flows[1] : null;

    const lto = computeLtoEfficiency({
      outdoor_c: outdoor_temp_c,
      supply_hru_c: supply_hru_temp_c,
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

    return {
      supply_fan_pct: supply,
      exhaust_fan_pct: exhaust,
      supply_target_pct: supplyTarget,
      exhaust_target_pct: exhaustTarget,
      outdoor_temp_c,
      supply_hru_temp_c,
      exhaust_temp_c,
      supply_room_temp_c,
      exhaust_hru_temp_c,
      supply_airflow_m3h,
      exhaust_airflow_m3h,
      internal_humidity_pct: humidity,
      lto_temp_efficiency_pct: lto.temp_pct,
      lto_energy_efficiency_pct: lto.energy_pct,
      direct_control: (directControl ?? 0) > 0,
      fireplace_active: (fireplaceHold ?? fireplaceStatus ?? 0) > 0,
      hood_flap_open: (hoodFlap ?? 0) > 0,
      emergency_stop: (emergency ?? 0) > 0,
      away_mode: (away ?? 0) > 0,
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
    await client.writeRegister(HOLDING.direct_control_enabled, 1);
    await client.writeRegister(HOLDING.supply_direct_pct, supply);
    await client.writeRegister(HOLDING.exhaust_direct_pct, exhaust);
    return true;
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

function targetsMatch(
  airfi: AirfiState,
  supply: number,
  exhaust: number,
): boolean {
  return (
    airfi.supply_target_pct === supply &&
    airfi.exhaust_target_pct === exhaust &&
    airfi.direct_control
  );
}

export type VentilationTargets = {
  supply: number;
  exhaust: number;
  fireplace: boolean;
};

export function hubStateToAirfiState(state: HubState): AirfiState | null {
  if (state.airfi_online === false) return null;
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
    direct_control: state.direct_control ?? false,
    fireplace_active: state.fireplace_active ?? false,
    hood_flap_open: state.hood_active ?? false,
    emergency_stop: state.emergency_stop ?? false,
    away_mode: state.away_mode ?? false,
  };
}

export function computeVentilationTargets(
  controlMode: HubControlMode,
  co2Ppm: number | null | undefined,
  config: VentilationConfig,
  airfi: AirfiState | null,
): VentilationTargets | null {
  if (!airfi || airfi.emergency_stop || airfi.away_mode) return null;

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
    default:
      if (co2Ppm == null) return null;
      const pct = computeAutoFanPct(co2Ppm, config);
      supply = pct;
      exhaust = pct;
      break;
  }

  supply = clampFanPct(supply);
  exhaust = clampFanPct(exhaust);

  if (targetsMatch(airfi, supply, exhaust) && airfi.fireplace_active === fireplace) {
    return null;
  }

  return { supply, exhaust, fireplace };
}

export async function applyVentilationControl(
  controlMode: HubControlMode,
  co2Ppm: number | null | undefined,
  config: VentilationConfig,
  airfi: AirfiState | null,
): Promise<VentilationTargets | null> {
  const targets = computeVentilationTargets(controlMode, co2Ppm, config, airfi);
  if (!targets) return null;

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
    fan_speed: airfi.supply_fan_pct,
    fan_speed_target: airfi.supply_target_pct,
    direct_control: airfi.direct_control,
    fireplace_active: airfi.fireplace_active,
    hood_active: airfi.hood_flap_open,
    away_mode: airfi.away_mode,
    emergency_stop: airfi.emergency_stop,
    fault: false,
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
  if (command === "set_mode") {
    return true;
  }
  return false;
}
