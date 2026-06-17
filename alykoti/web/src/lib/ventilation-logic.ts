import type { VentilationConfig } from "@/lib/types";

export type Co2Band = "normal" | "elevated" | "high" | "max";

export const MIN_FAN_PCT = 25;
export const MAX_FAN_PCT = 100;

const BAND_LABELS: Record<Co2Band, string> = {
  normal: "Normaali",
  elevated: "Kohonnut",
  high: "Korkea",
  max: "Huono",
};

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

export function getCo2BandLabel(band: Co2Band): string {
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

export function computeAutoFanPct(
  co2: number,
  config: VentilationConfig,
  hour = currentHourHelsinki(),
): number {
  let pct = computeBaseCo2FanPct(co2, config);
  if (isNightMode(config, hour)) {
    pct = Math.min(pct, config.night_max_pct);
  }
  return clampFanPct(pct);
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
