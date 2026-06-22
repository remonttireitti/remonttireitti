/** LTO-höytysuhde lämpötiloista ja ilmamääristä / nopeuksista. */

export type LtoEfficiencyResult = {
  /** Lämpöhöytys η_T = (T_tulo − T_ulo) / (T_poisto − T_ulo) */
  temp_pct: number | null;
  /** Energiahöytys η_E = η_T × (Q_tulo / Q_poisto) */
  energy_pct: number | null;
  /** Käytetty tuloilman lämpötila (T2 tai T4) */
  supply_c_used: number | null;
  flow_source: "m3h" | "fan_pct" | null;
};

export function parseAirfiTempC(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  const c = raw / 10;
  if (c < -50 || c > 80) return null;
  return Math.round(c * 10) / 10;
}

export function computeLtoTempEfficiency(
  outdoor_c: number,
  exhaust_c: number,
  supply_after_hru_c: number,
): number | null {
  const deltaExhaust = exhaust_c - outdoor_c;
  if (Math.abs(deltaExhaust) < 0.3) return null;
  if (exhaust_c <= outdoor_c + 0.1) return null;

  const gained = supply_after_hru_c - outdoor_c;
  const pct = (gained / deltaExhaust) * 100;
  if (!Number.isFinite(pct)) return null;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

export function computeLtoEnergyEfficiency(
  tempEfficiency_pct: number,
  supplyFlow: number,
  exhaustFlow: number,
): number | null {
  if (supplyFlow <= 0 || exhaustFlow <= 0) return null;
  const pct = tempEfficiency_pct * (supplyFlow / exhaustFlow);
  if (!Number.isFinite(pct)) return null;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

export function computeLtoEfficiency(input: {
  outdoor_c: number | null;
  supply_hru_c: number | null;
  supply_room_c: number | null;
  exhaust_c: number | null;
  supply_airflow_m3h?: number | null;
  exhaust_airflow_m3h?: number | null;
  supply_fan_pct?: number | null;
  exhaust_fan_pct?: number | null;
}): LtoEfficiencyResult {
  const supply_c_used = input.supply_room_c ?? input.supply_hru_c;
  if (
    input.outdoor_c == null ||
    input.exhaust_c == null ||
    supply_c_used == null
  ) {
    return { temp_pct: null, energy_pct: null, supply_c_used: null, flow_source: null };
  }

  const temp_pct = computeLtoTempEfficiency(
    input.outdoor_c,
    input.exhaust_c,
    supply_c_used,
  );
  if (temp_pct == null) {
    return { temp_pct: null, energy_pct: null, supply_c_used, flow_source: null };
  }

  const supplyM3h = input.supply_airflow_m3h;
  const exhaustM3h = input.exhaust_airflow_m3h;
  if (
    supplyM3h != null &&
    exhaustM3h != null &&
    supplyM3h > 0 &&
    exhaustM3h > 0
  ) {
    return {
      temp_pct,
      energy_pct: computeLtoEnergyEfficiency(temp_pct, supplyM3h, exhaustM3h),
      supply_c_used,
      flow_source: "m3h",
    };
  }

  const supplyPct = input.supply_fan_pct;
  const exhaustPct = input.exhaust_fan_pct;
  if (
    supplyPct != null &&
    exhaustPct != null &&
    supplyPct > 0 &&
    exhaustPct > 0
  ) {
    return {
      temp_pct,
      energy_pct: computeLtoEnergyEfficiency(temp_pct, supplyPct, exhaustPct),
      supply_c_used,
      flow_source: "fan_pct",
    };
  }

  return { temp_pct, energy_pct: temp_pct, supply_c_used, flow_source: null };
}

/** Laske LTO hub-staten lämpötiloista ja puhaltimista (Yellow-synkki / Vercel). */
export function enrichLtoFromHubState(state: {
  outdoor_temp_c?: number | null;
  exhaust_temp_c?: number | null;
  supply_room_temp_c?: number | null;
  supply_hru_temp_c?: number | null;
  exhaust_hru_temp_c?: number | null;
  supply_airflow_m3h?: number | null;
  exhaust_airflow_m3h?: number | null;
  fan_supply_pct?: number | null;
  fan_exhaust_pct?: number | null;
}): { lto_temp_efficiency_pct: number | null; lto_energy_efficiency_pct: number | null } {
  const lto = computeLtoEfficiency({
    outdoor_c: state.outdoor_temp_c ?? null,
    supply_hru_c: state.supply_hru_temp_c ?? null,
    supply_room_c: state.supply_room_temp_c ?? null,
    exhaust_c: state.exhaust_temp_c ?? null,
    supply_airflow_m3h: state.supply_airflow_m3h ?? null,
    exhaust_airflow_m3h: state.exhaust_airflow_m3h ?? null,
    supply_fan_pct: state.fan_supply_pct ?? null,
    exhaust_fan_pct: state.fan_exhaust_pct ?? null,
  });
  return {
    lto_temp_efficiency_pct: lto.temp_pct,
    lto_energy_efficiency_pct: lto.energy_pct,
  };
}
