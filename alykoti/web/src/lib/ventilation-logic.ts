import type { VentilationConfig } from "@/lib/types";

export type Co2Band = "normal" | "elevated" | "high" | "max";
export type Pm25Band = Co2Band;

export const MIN_FAN_PCT = 25;
export const MAX_FAN_PCT = 100;
export const FAN_RAMP_STEP_PCT = 5;
export const HEAT_BOOST_INDOOR_MIN_C = 25;
export const HEAT_BOOST_OUTDOOR_MIN_C = 20;
export const HEAT_BOOST_PCT = 15;

const BAND_LABELS: Record<Co2Band, string> = {
  normal: "Normaali",
  elevated: "Kohonnut",
  high: "Korkea",
  max: "Huono",
};

export type AutoFanInputs = {
  co2?: number | null;
  pm25?: number | null;
  humidity?: number | null;
  indoorTempC?: number | null;
  outdoorTempC?: number | null;
};

export type HumidityBand = Co2Band;

/** Korkein kosteus kaikista lähteistä (Zigbee-anturit, Airthings, AirFi). */
export function collectVentilationHumidityPct(input: {
  homeDevices?: Record<string, { humidity_pct?: number | null }> | null;
  airthingsHumidity?: number | null;
  airfiHumidity?: number | null;
}): number | null {
  const values: number[] = [];
  const add = (v: number | null | undefined) => {
    if (v != null && Number.isFinite(v) && v >= 0 && v <= 100) values.push(v);
  };
  add(input.airthingsHumidity);
  add(input.airfiHumidity);
  if (input.homeDevices) {
    for (const device of Object.values(input.homeDevices)) {
      add(device.humidity_pct);
    }
  }
  if (values.length === 0) return null;
  return Math.max(...values);
}

export function clampFanPct(value: number): number {
  return Math.max(MIN_FAN_PCT, Math.min(MAX_FAN_PCT, Math.round(value)));
}

export function currentHourHelsinki(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Helsinki",
    }).format(new Date()),
  );
}

export function isNightMode(config: VentilationConfig, hour = currentHourHelsinki()): boolean {
  if (!config.night_enabled) return false;
  const start = config.night_start_hour;
  const end = config.night_end_hour;
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export function getCo2Band(co2: number, config: VentilationConfig): Co2Band {
  if (co2 < config.co2_normal_max) return "normal";
  if (co2 < config.co2_elevated_max) return "elevated";
  if (co2 < config.co2_high_max) return "high";
  return "max";
}

export function getPm25Band(pm25: number, config: VentilationConfig): Pm25Band {
  if (pm25 < config.pm25_normal_max) return "normal";
  if (pm25 < config.pm25_elevated_max) return "elevated";
  if (pm25 < config.pm25_high_max) return "high";
  return "max";
}

export function getCo2BandLabel(band: Co2Band): string {
  return BAND_LABELS[band];
}

export function getPm25BandLabel(band: Pm25Band): string {
  return BAND_LABELS[band];
}

export function getHumidityBand(humidity: number, config: VentilationConfig): HumidityBand {
  if (humidity < config.humidity_normal_max) return "normal";
  if (humidity < config.humidity_elevated_max) return "elevated";
  if (humidity < config.humidity_high_max) return "high";
  return "max";
}

export function getHumidityBandLabel(band: HumidityBand): string {
  return BAND_LABELS[band];
}

function lerpPct(
  value: number,
  low: number,
  high: number,
  pctLow: number,
  pctHigh: number,
): number {
  if (high <= low) return pctHigh;
  const t = (value - low) / (high - low);
  return pctLow + t * (pctHigh - pctLow);
}

/** Liukuva CO₂ → % (25–100), ei portaittain. */
export function computeBaseCo2FanPct(co2: number, config: VentilationConfig): number {
  if (co2 <= config.co2_normal_max) {
    return config.speed_normal_pct;
  }
  if (co2 <= config.co2_elevated_max) {
    return lerpPct(
      co2,
      config.co2_normal_max,
      config.co2_elevated_max,
      config.speed_normal_pct,
      config.speed_elevated_pct,
    );
  }
  if (co2 <= config.co2_high_max) {
    return lerpPct(
      co2,
      config.co2_elevated_max,
      config.co2_high_max,
      config.speed_elevated_pct,
      config.speed_high_pct,
    );
  }
  const over = co2 - config.co2_high_max;
  const extra = Math.min(over / 400, 1) * (config.speed_max_pct - config.speed_high_pct);
  return config.speed_high_pct + extra;
}

/** Liukuva kosteus → % (25–100), sama kaava kuin CO₂. */
export function computeBaseHumidityFanPct(humidity: number, config: VentilationConfig): number {
  if (humidity <= config.humidity_normal_max) {
    return config.speed_normal_pct;
  }
  if (humidity <= config.humidity_elevated_max) {
    return lerpPct(
      humidity,
      config.humidity_normal_max,
      config.humidity_elevated_max,
      config.speed_normal_pct,
      config.speed_elevated_pct,
    );
  }
  if (humidity <= config.humidity_high_max) {
    return lerpPct(
      humidity,
      config.humidity_elevated_max,
      config.humidity_high_max,
      config.speed_elevated_pct,
      config.speed_high_pct,
    );
  }
  const over = humidity - config.humidity_high_max;
  const extra = Math.min(over / 15, 1) * (config.speed_max_pct - config.speed_high_pct);
  return config.speed_high_pct + extra;
}

/** Liukuva PM2.5 → % (25–100), sama kaava kuin CO₂. */
export function computeBasePm25FanPct(pm25: number, config: VentilationConfig): number {
  if (pm25 <= config.pm25_normal_max) {
    return config.speed_normal_pct;
  }
  if (pm25 <= config.pm25_elevated_max) {
    return lerpPct(
      pm25,
      config.pm25_normal_max,
      config.pm25_elevated_max,
      config.speed_normal_pct,
      config.speed_elevated_pct,
    );
  }
  if (pm25 <= config.pm25_high_max) {
    return lerpPct(
      pm25,
      config.pm25_elevated_max,
      config.pm25_high_max,
      config.speed_elevated_pct,
      config.speed_high_pct,
    );
  }
  const over = pm25 - config.pm25_high_max;
  const extra = Math.min(over / 50, 1) * (config.speed_max_pct - config.speed_high_pct);
  return config.speed_high_pct + extra;
}

export function isHeatBoostActive(
  inputs: Pick<AutoFanInputs, "indoorTempC" | "outdoorTempC">,
  config: VentilationConfig,
  hour = currentHourHelsinki(),
): boolean {
  if (isNightMode(config, hour)) return false;
  const indoor = inputs.indoorTempC;
  const outdoor = inputs.outdoorTempC;
  if (indoor == null || outdoor == null) return false;
  return indoor > HEAT_BOOST_INDOOR_MIN_C && outdoor > HEAT_BOOST_OUTDOOR_MIN_C;
}

/** Liukuva säätö: CO₂, kosteus ja PM2.5 erikseen → korkeampi voittaa; lämpöboost päivällä. */
export function computeAutoFanPct(
  inputs: AutoFanInputs | number,
  config: VentilationConfig,
  hour = currentHourHelsinki(),
): number | null {
  const normalized: AutoFanInputs =
    typeof inputs === "number" ? { co2: inputs } : inputs;

  const candidates: number[] = [];
  if (normalized.co2 != null && Number.isFinite(normalized.co2)) {
    candidates.push(computeBaseCo2FanPct(normalized.co2, config));
  }
  if (normalized.humidity != null && Number.isFinite(normalized.humidity)) {
    candidates.push(computeBaseHumidityFanPct(normalized.humidity, config));
  }
  if (normalized.pm25 != null && Number.isFinite(normalized.pm25)) {
    candidates.push(computeBasePm25FanPct(normalized.pm25, config));
  }
  if (candidates.length === 0) return null;

  let pct = Math.max(...candidates);

  if (isHeatBoostActive(normalized, config, hour)) {
    pct += HEAT_BOOST_PCT;
  }

  if (isNightMode(config, hour)) {
    pct = Math.min(pct, config.night_max_pct);
  }

  return clampFanPct(pct);
}

/** Liukuva siirtymä nykyisestä tavoitteesta uuteen (ei äkillisiä hyppyjä). */
export function smoothRampFanPct(current: number | null | undefined, target: number): number {
  if (current == null || !Number.isFinite(current)) return clampFanPct(target);
  const delta = target - current;
  const gap = Math.abs(delta);
  if (gap <= FAN_RAMP_STEP_PCT) return clampFanPct(target);
  // Suuri ero → isompi askel, jotta toteutus ei jää jumiin (synkki ~30 s välein).
  const step = gap > 20 ? 15 : gap > 10 ? 10 : FAN_RAMP_STEP_PCT;
  return clampFanPct(current + Math.sign(delta) * step);
}

export function formatNightWindow(config: VentilationConfig): string {
  const pad = (h: number) => `${h.toString().padStart(2, "0")}:00`;
  return `${pad(config.night_start_hour)} – ${pad(config.night_end_hour)}`;
}

/** Vanha 0–5 asteikko → prosentit. */
export function migrateLegacySpeedPct(value: number): number {
  if (value > 5) return clampFanPct(value);
  const map = [25, 35, 50, 65, 80, 95];
  return clampFanPct(map[Math.max(0, Math.min(5, Math.round(value)))] ?? 50);
}
