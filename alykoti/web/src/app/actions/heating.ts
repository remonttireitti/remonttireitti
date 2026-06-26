"use server";

import { revalidateLaitteet } from "@/lib/revalidate-laitteet";
import {
  DEFAULT_HYSTERESIS_C,
  DEFAULT_MIN_OFF_SEC,
  DEFAULT_MIN_ON_SEC,
  DEFAULT_PUMP_START_DELAY_SEC,
  newThermostatId,
  normalizeHeatingThermostats,
} from "@/lib/heating-thermostats";
import { fetchPrimaryHub, parseHubConfig } from "@/lib/hubs";
import type { HeatingThermostat, HubConfig } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type HeatingActionState = {
  error?: string;
  ok?: string;
};

async function requireHub() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." as const, supabase: null, hub: null };

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) return { error: "Keskusyksikköä ei löydy." as const, supabase: null, hub: null };

  return { supabase, hub, error: null };
}

async function saveThermostats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hubId: string,
  configRaw: unknown,
  thermostats: HeatingThermostat[],
): Promise<HeatingActionState> {
  const config: HubConfig = {
    ...parseHubConfig(configRaw),
    heating_thermostats: thermostats,
  };

  const { error } = await supabase.from("hubs").update({ config }).eq("id", hubId);
  if (error) return { error: "Tallennus epäonnistui." };
  revalidateLaitteet();
  return { ok: "Termostaatti tallennettu. Yellow päivittää asetukset seuraavassa synkissä (~30 s)." };
}

export async function saveThermostat(input: {
  id?: string;
  name: string;
  enabled: boolean;
  sensor_device_id: string;
  sensor_reading_label?: string | null;
  actuator_device_ids: string[];
  target_temp_c: number;
  hysteresis_c?: number;
  min_on_sec?: number;
  min_off_sec?: number;
  room?: string | null;
}): Promise<HeatingActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const name = input.name.trim();
  if (!name) return { error: "Anna termostaatille nimi." };

  const sensor = input.sensor_device_id?.trim();
  const actuatorIds = [...new Set(input.actuator_device_ids.map((id) => id.trim()).filter(Boolean))];
  if (!sensor?.includes(":")) return { error: "Valitse lämpötila-anturi." };
  if (actuatorIds.length === 0) return { error: "Valitse vähintään yksi lämmitystoimilainen." };
  if (actuatorIds.some((id) => !id.includes(":"))) {
    return { error: "Virheellinen toimilainen." };
  }
  if (actuatorIds.includes(sensor)) {
    return { error: "Anturi ei voi olla samalla laitteella kuin toimilainen." };
  }

  const target = input.target_temp_c;
  if (!Number.isFinite(target) || target < 5 || target > 35) {
    return { error: "Tavoitelämpötilan pitää olla 5–35 °C." };
  }

  const hysteresis = input.hysteresis_c ?? DEFAULT_HYSTERESIS_C;
  if (!Number.isFinite(hysteresis) || hysteresis < 0.1 || hysteresis > 5) {
    return { error: "Hystereesi 0,1–5 °C." };
  }

  const thermostats = normalizeHeatingThermostats(parseHubConfig(ctx.hub.config).heating_thermostats);
  const id = input.id?.trim() || newThermostatId();

  const sensorReadingLabel = input.sensor_reading_label?.trim() || null;

  const thermostat: HeatingThermostat = {
    id,
    name,
    enabled: input.enabled,
    sensor_device_id: sensor,
    sensor_reading_label: sensorReadingLabel,
    actuator_device_ids: actuatorIds,
    target_temp_c: Math.round(target * 10) / 10,
    hysteresis_c: Math.round(hysteresis * 10) / 10,
    min_on_sec: Math.max(0, Math.round(input.min_on_sec ?? DEFAULT_MIN_ON_SEC)),
    min_off_sec: Math.max(0, Math.round(input.min_off_sec ?? DEFAULT_MIN_OFF_SEC)),
    room: input.room?.trim() || null,
  };

  const idx = thermostats.findIndex((z) => z.id === id);
  if (idx >= 0) thermostats[idx] = thermostat;
  else thermostats.push(thermostat);

  const { data: row } = await ctx.supabase
    .from("hubs")
    .select("config")
    .eq("id", ctx.hub.id)
    .single();

  return saveThermostats(ctx.supabase, ctx.hub.id, row?.config, thermostats);
}

export async function deleteThermostat(thermostatId: string): Promise<HeatingActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const thermostats = normalizeHeatingThermostats(
    parseHubConfig(ctx.hub.config).heating_thermostats,
  ).filter((z) => z.id !== thermostatId);

  const { data: row } = await ctx.supabase
    .from("hubs")
    .select("config")
    .eq("id", ctx.hub.id)
    .single();

  const result = await saveThermostats(ctx.supabase, ctx.hub.id, row?.config, thermostats);
  if (result.ok) return { ok: "Termostaatti poistettu." };
  return result;
}

export async function toggleThermostat(thermostatId: string, enabled: boolean): Promise<HeatingActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const thermostats = normalizeHeatingThermostats(parseHubConfig(ctx.hub.config).heating_thermostats);
  const idx = thermostats.findIndex((z) => z.id === thermostatId);
  if (idx < 0) return { error: "Termostaattia ei löydy." };

  thermostats[idx] = { ...thermostats[idx], enabled };

  const { data: row } = await ctx.supabase
    .from("hubs")
    .select("config")
    .eq("id", ctx.hub.id)
    .single();

  return saveThermostats(ctx.supabase, ctx.hub.id, row?.config, thermostats);
}

export async function saveHeatingPump(input: {
  enabled: boolean;
  actuator_device_id: string;
}): Promise<HeatingActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const { data: row } = await ctx.supabase
    .from("hubs")
    .select("config")
    .eq("id", ctx.hub.id)
    .single();

  const config: HubConfig = {
    ...parseHubConfig(row?.config),
  };

  if (!input.enabled) {
    config.heating_pump = null;
  } else {
    const actuator = input.actuator_device_id?.trim();
    if (!actuator?.includes(":")) return { error: "Valitse pumppurele." };

    config.heating_pump = {
      enabled: true,
      actuator_device_id: actuator,
      start_delay_sec: DEFAULT_PUMP_START_DELAY_SEC,
    };
  }

  const { error } = await ctx.supabase.from("hubs").update({ config }).eq("id", ctx.hub.id);
  if (error) return { error: "Tallennus epäonnistui." };
  revalidateLaitteet();
  return {
    ok: input.enabled
      ? "Pumppuasetus tallennettu. Yellow päivittää asetukset seuraavassa synkissä (~30 s)."
      : "Pumppuohjaus poistettu käytöstä.",
  };
}
