/** LTO-höytysuhde lämpötiloista ja ilmamääristä / nopeuksista. */

/** Alle tämän puhaltimen %-nopeuden LTO ei ole mielekäs (ei ilmavirtaa). */
const MIN_FAN_PCT_FOR_LTO = 10;

export function fansActiveForLto(
  supply_fan_pct?: number | null,
  exhaust_fan_pct?: number | null,
): boolean {
  const supply = supply_fan_pct ?? 0;
  const exhaust = exhaust_fan_pct ?? 0;
  return supply >= MIN_FAN_PCT_FOR_LTO && exhaust >= MIN_FAN_PCT_FOR_LTO;
}

export type LtoEfficiencyResult = {
  /** Lämpöhöytys η_T = (T_tulo − T_ulo) / (T_poisto − T_ulo) */
  temp_pct: number | null;
  /** Energiahöytys η_E = η_T × (Q_tulo / Q_poisto) */
  energy_pct: number | null;
  /** Käytetty tuloilman lämpötila (T5 tai T2) */
  supply_c_used: number | null;
  flow_source: "m3h" | "fan_pct" | null;
  /** Lämpö talteen ulkoilmaan °C (T_tulo − T_ulo) */
  gained_c: number | null;
  /** Poistoilman lämpöero ulkoilmaan °C (T_poisto − T_ulo) */
  available_c: number | null;
  /** Ennen 0–100 % rajaa */
  raw_temp_pct: number | null;
  /** Rajattu 100 %:iin (esim. jälkilämmitys) */
  capped_at_100: boolean;
};

export type LtoEfficiencyDescription = {
  badgeSub: string | null;
  trendHint: string;
  modalExplanation: string;
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
  const raw_pct = (gained / deltaExhaust) * 100;
  if (!Number.isFinite(raw_pct)) return null;
  return Math.max(0, Math.min(100, Math.round(raw_pct * 10) / 10));
}

function ltoTempParts(
  outdoor_c: number,
  exhaust_c: number,
  supply_after_hru_c: number,
): {
  gained_c: number;
  available_c: number;
  raw_temp_pct: number | null;
  temp_pct: number;
  capped_at_100: boolean;
} | null {
  const deltaExhaust = exhaust_c - outdoor_c;
  if (Math.abs(deltaExhaust) < 0.3) return null;
  if (exhaust_c <= outdoor_c + 0.1) return null;

  const gained_c = Math.round((supply_after_hru_c - outdoor_c) * 10) / 10;
  const available_c = Math.round(deltaExhaust * 10) / 10;
  const raw_temp_pct = Math.round(((gained_c / available_c) * 100) * 10) / 10;
  if (!Number.isFinite(raw_temp_pct)) return null;

  const capped_at_100 = raw_temp_pct > 100;
  const temp_pct = Math.max(0, Math.min(100, raw_temp_pct));

  return { gained_c, available_c, raw_temp_pct, temp_pct, capped_at_100 };
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
  if (!fansActiveForLto(input.supply_fan_pct, input.exhaust_fan_pct)) {
    return {
      temp_pct: null,
      energy_pct: null,
      supply_c_used: null,
      flow_source: null,
      gained_c: null,
      available_c: null,
      raw_temp_pct: null,
      capped_at_100: false,
    };
  }

  const supply_c_used = input.supply_room_c ?? input.supply_hru_c;
  if (
    input.outdoor_c == null ||
    input.exhaust_c == null ||
    supply_c_used == null
  ) {
    return {
      temp_pct: null,
      energy_pct: null,
      supply_c_used: null,
      flow_source: null,
      gained_c: null,
      available_c: null,
      raw_temp_pct: null,
      capped_at_100: false,
    };
  }

  const parts = ltoTempParts(input.outdoor_c, input.exhaust_c, supply_c_used);
  if (parts == null) {
    return {
      temp_pct: null,
      energy_pct: null,
      supply_c_used,
      flow_source: null,
      gained_c: null,
      available_c: null,
      raw_temp_pct: null,
      capped_at_100: false,
    };
  }

  const temp_pct = parts.temp_pct;

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
      gained_c: parts.gained_c,
      available_c: parts.available_c,
      raw_temp_pct: parts.raw_temp_pct,
      capped_at_100: parts.capped_at_100,
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
      gained_c: parts.gained_c,
      available_c: parts.available_c,
      raw_temp_pct: parts.raw_temp_pct,
      capped_at_100: parts.capped_at_100,
    };
  }

  return {
    temp_pct,
    energy_pct: temp_pct,
    supply_c_used,
    flow_source: null,
    gained_c: parts.gained_c,
    available_c: parts.available_c,
    raw_temp_pct: parts.raw_temp_pct,
    capped_at_100: parts.capped_at_100,
  };
}

/** Selkokielinen kuvaus käyttöliittymään. */
export function describeLtoEfficiency(result: LtoEfficiencyResult): LtoEfficiencyDescription {
  const trendHint =
    "Lämpöhöytys kertoo, kuinka suuren osan poistoilman lämmöstä LTO siirtää tuloilmaan. 100 % = tulo yhtä lämmin kuin poisto ennen jälkilämmitystä — ei tarkoita että poisto olisi kylmä. Jäteilma T4 näyttää mitä lähtee ulos.";

  if (
    result.temp_pct == null ||
    result.gained_c == null ||
    result.available_c == null
  ) {
    return {
      badgeSub: null,
      trendHint,
      modalExplanation:
        "LTO-höytystä ei voida laskea: tuuletus seis tai lämpötilaero liian pieni. Tarvitaan ulkoilma T1, poisto T3 ja tulo T5.",
    };
  }

  const { gained_c, available_c, temp_pct, capped_at_100, raw_temp_pct } = result;

  let badgeSub = `+${gained_c.toFixed(1)} °C / ${available_c.toFixed(1)} °C`;
  let modalExplanation =
    `Poistoilma on ${available_c.toFixed(1)} °C lämpimämpää kuin ulkoilma. LTO nostaa tuloilmaa ${gained_c.toFixed(1)} °C — höytys ${temp_pct.toFixed(1)} %.`;

  if (capped_at_100 && raw_temp_pct != null && raw_temp_pct > 100) {
    badgeSub = `+${gained_c.toFixed(1)} °C (täysi LTO)`;
    modalExplanation =
      `Tuloilma on jo lämpimämpää (${gained_c.toFixed(1)} °C yli ulkoilman) kuin mitä poistoilman lämmöstä (${available_c.toFixed(1)} °C) voidaan siirtää — LTO on täynnä (100 %). ` +
      "Ero voi johtua jälkilämmityksestä tai mittaushetkestä. Jäteilma T4 näyttää lämmön joka lähtee talosta ulos LTO:n jälkeen.";
  } else {
    modalExplanation +=
      " 100 % tarkoittaisi että kaikki poistoilman lämpö siirtyisi tuloilmaan — poisto ei olisi lämpimämpi kuin tulo.";
  }

  return { badgeSub, trendHint, modalExplanation };
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
