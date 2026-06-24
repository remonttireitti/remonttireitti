import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAutomationRules } from "@/lib/automation";
import { normalizeElectricityPricePeriods } from "@/lib/electricity-price-periods";
import { normalizeHeatingThermostats } from "@/lib/heating-thermostats";
import {
  DEFAULT_VENTILATION_CONFIG,
  type Hub,
  type HubConfig,
  type HubState,
  type VentilationConfig,
} from "@/lib/types";
import { migrateLegacySpeedPct } from "@/lib/ventilation-logic";

export function parseVentilationConfig(raw: unknown): VentilationConfig {
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

export function parseHubConfig(raw: unknown): HubConfig {
  const ventilation = parseVentilationConfig(raw);
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const automations = normalizeAutomationRules(record.automations);
  const electricity_price_periods = normalizeElectricityPricePeriods(
    record.electricity_price_periods,
  );
  const heating_thermostats = normalizeHeatingThermostats(record.heating_thermostats);
  return {
    ...ventilation,
    automations,
    electricity_price_periods,
    heating_thermostats,
  };
}

/** @deprecated käytä parseHubConfig */
function parseConfig(raw: unknown): VentilationConfig {
  return parseVentilationConfig(raw);
}

function parseState(raw: unknown): HubState {
  if (!raw || typeof raw !== "object") return {};
  return raw as HubState;
}

export function normalizeHub(row: Record<string, unknown>): Hub {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    device_type: String(row.device_type ?? "hub"),
    firmware_version: row.firmware_version ? String(row.firmware_version) : null,
    last_seen_at: row.last_seen_at ? String(row.last_seen_at) : null,
    control_mode:
      row.control_mode === "manual" ||
      row.control_mode === "fireplace" ||
      row.control_mode === "hood"
        ? row.control_mode
        : "auto",
    state: parseState(row.state),
    config: parseHubConfig(row.config),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function fetchHubs(
  supabase: SupabaseClient,
  userId: string,
): Promise<Hub[]> {
  const { data, error } = await supabase
    .from("hubs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeHub(row));
}

export async function fetchHub(
  supabase: SupabaseClient,
  hubId: string,
  userId: string,
): Promise<Hub | null> {
  const { data, error } = await supabase
    .from("hubs")
    .select("*")
    .eq("id", hubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeHub(data) : null;
}

/** Ensimmäinen (päivittynyt viimeksi) keskusyksikkö ilmanvaihdolle. */
export async function fetchPrimaryHub(
  supabase: SupabaseClient,
  userId: string,
): Promise<Hub | null> {
  const hubs = await fetchHubs(supabase, userId);
  return hubs[0] ?? null;
}

export function formatLastSeen(iso: string | null): string {
  if (!iso) return "Ei yhteyttä";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 120_000) return "Juuri nyt";
  if (diffMs < 3_600_000) {
    return `${Math.round(diffMs / 60_000)} min sitten`;
  }
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function validateVentilationConfig(
  config: VentilationConfig,
): string | null {
  if (config.co2_normal_max >= config.co2_elevated_max) {
    return "CO₂ normaali-rajan pitää olla alle kohonneen.";
  }
  if (config.co2_elevated_max >= config.co2_high_max) {
    return "CO₂ kohonnut-rajan pitää olla alle korkean.";
  }
  if (config.co2_normal_max < 400 || config.co2_high_max > 5000) {
    return "CO₂-rajat 400–5000 ppm.";
  }
  if (config.pm25_normal_max >= config.pm25_elevated_max) {
    return "PM2.5 normaali-rajan pitää olla alle kohonneen.";
  }
  if (config.pm25_elevated_max >= config.pm25_high_max) {
    return "PM2.5 kohonnut-rajan pitää olla alle korkean.";
  }
  if (config.pm25_normal_max < 1 || config.pm25_high_max > 500) {
    return "PM2.5-rajat 1–500 µg/m³.";
  }
  if (config.humidity_normal_max >= config.humidity_elevated_max) {
    return "Kosteus normaali-rajan pitää olla alle kohonneen.";
  }
  if (config.humidity_elevated_max >= config.humidity_high_max) {
    return "Kosteus kohonnut-rajan pitää olla alle korkean.";
  }
  if (config.humidity_normal_max < 30 || config.humidity_high_max > 100) {
    return "Kosteusrajat 30–100 %.";
  }
  for (const speed of [
    config.speed_normal_pct,
    config.speed_elevated_pct,
    config.speed_high_pct,
    config.speed_max_pct,
    config.night_max_pct,
    config.fireplace_supply_pct,
    config.fireplace_exhaust_pct,
    config.hood_supply_pct,
    config.hood_exhaust_pct,
  ]) {
    if (!Number.isInteger(speed) || speed < 25 || speed > 100) {
      return "Nopeuksien pitää olla 25–100 %.";
    }
  }
  if (
    !Number.isInteger(config.night_start_hour) ||
    config.night_start_hour < 0 ||
    config.night_start_hour > 23 ||
    !Number.isInteger(config.night_end_hour) ||
    config.night_end_hour < 0 ||
    config.night_end_hour > 23
  ) {
    return "Yöaika 0–23.";
  }
  return null;
}

// Yhteensopivuus
export const fetchControllers = fetchHubs;
export const fetchController = fetchHub;
export const normalizeController = normalizeHub;
export const validateAutomationConfig = validateVentilationConfig;
