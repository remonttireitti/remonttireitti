"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { revalidateLaitteet } from "@/lib/revalidate-laitteet";
import { validateVentilationConfig, parseHubConfig } from "@/lib/hubs";
import {
  extendUntil,
  formatRemaining,
  remainingMs,
  TIMED_MODE_STEP_MS,
} from "@/lib/mode-schedule";
import {
  DEFAULT_VENTILATION_CONFIG,
  type HubControlMode,
  type HubState,
  type VentilationConfig,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  ok?: string;
  deviceToken?: string;
  commandIds?: string[];
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function getOwnedHubRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hubId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("hubs")
    .select("id, state, config, control_mode")
    .eq("id", hubId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

async function patchHubState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hubId: string,
  statePatch: Partial<HubState>,
  controlMode?: HubControlMode,
) {
  const { data: hub } = await supabase
    .from("hubs")
    .select("state")
    .eq("id", hubId)
    .single();
  const state: HubState = {
    ...((hub?.state as HubState) ?? {}),
    ...statePatch,
  };
  const update: { state: HubState; control_mode?: HubControlMode } = { state };
  if (controlMode) update.control_mode = controlMode;
  await supabase.from("hubs").update(update).eq("id", hubId);
}

async function queueFanCommand(
  hubId: string,
  config: VentilationConfig,
  mode: HubControlMode,
): Promise<ActionState> {
  const supply =
    mode === "fireplace"
      ? config.fireplace_supply_pct
      : mode === "hood"
        ? config.hood_supply_pct
        : null;
  const exhaust =
    mode === "fireplace"
      ? config.fireplace_exhaust_pct
      : mode === "hood"
        ? config.hood_exhaust_pct
        : null;
  const modeCmd = await queueCommand(hubId, "set_mode", { mode });
  if (supply == null || exhaust == null) return modeCmd;
  const fanCmd = await queueCommand(hubId, "set_fan_pct", {
    supply_pct: supply,
    exhaust_pct: exhaust,
    fireplace: mode === "fireplace",
  });
  if (fanCmd.error) return fanCmd;
  return {
    ok: fanCmd.ok,
    commandIds: [...(modeCmd.commandIds ?? []), ...(fanCmd.commandIds ?? [])],
  };
}

async function getOwnedHub(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hubId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("hubs")
    .select("id")
    .eq("id", hubId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function registerHub(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Anna keskusyksikölle nimi." };

  const deviceToken = randomBytes(32).toString("hex");
  const { error } = await supabase.from("hubs").insert({
    user_id: user.id,
    name,
    device_token: deviceToken,
    device_type: "hub",
    config: DEFAULT_VENTILATION_CONFIG,
  });

  if (error) return { error: "Keskusyksikön luonti epäonnistui." };

  revalidatePath("/");
  revalidateLaitteet();
  return {
    ok: "Keskusyksikkö luotu. Kopioi laiteavain firmware-asetuksiin.",
    deviceToken,
  };
}

export async function saveVentilationConfig(
  hubId: string,
  config: VentilationConfig,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const validationError = validateVentilationConfig(config);
  if (validationError) return { error: validationError };

  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }

  const { data: row } = await supabase.from("hubs").select("config").eq("id", hubId).single();
  const merged = {
    ...parseHubConfig(row?.config),
    ...config,
  };

  const { error } = await supabase
    .from("hubs")
    .update({ config: merged })
    .eq("id", hubId);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidatePath("/ilmanvaihto");
  revalidatePath("/ilmanvaihto/asetukset");
  return { ok: "Automaatioasetukset tallennettu. Keskusyksikkö päivittää ~60 s." };
}

async function queueCommand(
  hubId: string,
  command: string,
  payload: Record<string, unknown> = {},
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };

  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }

  const { data, error } = await supabase
    .from("commands")
    .insert({
      hub_id: hubId,
      user_id: user.id,
      command,
      payload,
    })
    .select("id")
    .single();

  if (error) return { error: "Komennon lähetys epäonnistui." };

  if (command === "set_mode") {
    const mode = payload.mode;
    const allowed = ["auto", "manual", "fireplace", "hood"];
    const next = allowed.includes(mode as string) ? mode : "auto";
    await supabase.from("hubs").update({ control_mode: next }).eq("id", hubId);
  }

  revalidatePath("/ilmanvaihto");
  revalidatePath("/ilmanvaihto/asetukset");
  if (command === "set_light" || command === "set_device") {
    revalidateLaitteet();
  }
  return { ok: "Komento jonossa — hub noutaa sen seuraavassa synkissä.", commandIds: [String(data.id)] };
}

export async function setFanPct(
  hubId: string,
  supplyPct: number,
  exhaustPct: number,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };

  if (
    !Number.isFinite(supplyPct) ||
    !Number.isFinite(exhaustPct) ||
    supplyPct < 25 ||
    supplyPct > 100 ||
    exhaustPct < 25 ||
    exhaustPct > 100
  ) {
    return { error: "Virheellinen nopeus (25–100 %)." };
  }

  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }

  await patchHubState(
    supabase,
    hubId,
    { fireplace_until: null, hood_until: null },
    "manual",
  );
  await queueCommand(hubId, "set_mode", { mode: "manual" });
  const fan = await queueCommand(hubId, "set_fan_pct", {
    supply_pct: Math.round(supplyPct),
    exhaust_pct: Math.round(exhaustPct),
    fireplace: false,
  });
  if (fan.error) return fan;
  return {
    ok: `Ohjaus ${Math.round(supplyPct)} % / ${Math.round(exhaustPct)} % jonossa. Hub suorittaa ~60 s kuluessa.`,
    commandIds: fan.commandIds,
  };
}

export async function setAutoMode(hubId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  const hub = await getOwnedHubRow(supabase, hubId, user.id);
  if (!hub) return { error: "Keskusyksikköä ei löydy." };

  await patchHubState(
    supabase,
    hubId,
    {
      fireplace_until: null,
      hood_until: null,
      away_until: null,
      away_unlimited: false,
    },
    "auto",
  );
  await queueCommand(hubId, "set_away", { away: false });
  return queueCommand(hubId, "set_mode", { mode: "auto" });
}

export async function setManualMode(hubId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }
  await patchHubState(
    supabase,
    hubId,
    { fireplace_until: null, hood_until: null },
    "manual",
  );
  return queueCommand(hubId, "set_mode", { mode: "manual" });
}

export async function extendFireplaceMode(hubId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  const hub = await getOwnedHubRow(supabase, hubId, user.id);
  if (!hub) return { error: "Keskusyksikköä ei löydy." };

  const state = (hub.state as HubState) ?? {};
  const until = extendUntil(state.fireplace_until, TIMED_MODE_STEP_MS);
  await patchHubState(
    supabase,
    hubId,
    { fireplace_until: until, hood_until: null },
    "fireplace",
  );
  const config = (hub.config as VentilationConfig) ?? DEFAULT_VENTILATION_CONFIG;
  const result = await queueFanCommand(hubId, config, "fireplace");
  const left = formatRemaining(remainingMs(until) ?? TIMED_MODE_STEP_MS);
  return {
    ...result,
    ok: `Takkatila +15 min (yhteensä ${left}).`,
  };
}

export async function extendHoodMode(hubId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  const hub = await getOwnedHubRow(supabase, hubId, user.id);
  if (!hub) return { error: "Keskusyksikköä ei löydy." };

  const state = (hub.state as HubState) ?? {};
  const until = extendUntil(state.hood_until, TIMED_MODE_STEP_MS);
  await patchHubState(
    supabase,
    hubId,
    { hood_until: until, fireplace_until: null },
    "hood",
  );
  const config = (hub.config as VentilationConfig) ?? DEFAULT_VENTILATION_CONFIG;
  const result = await queueFanCommand(hubId, config, "hood");
  const left = formatRemaining(remainingMs(until) ?? TIMED_MODE_STEP_MS);
  return {
    ...result,
    ok: `Liesituuletin +15 min (yhteensä ${left}).`,
  };
}

/** hours: null = rajaton kunnes lopetetaan */
export async function setAwayScheduled(
  hubId: string,
  hours: number | null,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }

  const until =
    hours != null ? extendUntil(null, hours * 3_600_000) : null;
  await patchHubState(supabase, hubId, {
    away_until: until,
    away_unlimited: hours == null,
    away_mode: true,
  });
  const msg =
    hours == null
      ? "Poissa-tila päällä toistaiseksi."
      : `Poissa-tila ${hours} h.`;
  const away = await queueCommand(hubId, "set_away", { away: true });
  return { ...away, ok: msg };
}

export async function clearAwayMode(hubId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }
  await patchHubState(supabase, hubId, {
    away_until: null,
    away_unlimited: false,
    away_mode: false,
  });
  return queueCommand(hubId, "set_away", { away: false });
}

export async function setRunMode(
  hubId: string,
  mode: "auto" | "manual" | "fireplace" | "hood",
): Promise<ActionState> {
  if (mode === "auto") return setAutoMode(hubId);
  if (mode === "manual") return setManualMode(hubId);
  if (mode === "fireplace") return extendFireplaceMode(hubId);
  return extendHoodMode(hubId);
}

/** @deprecated */
export async function setAutoModeLegacy(hubId: string): Promise<ActionState> {
  return setAutoMode(hubId);
}

export async function setAwayMode(
  hubId: string,
  away: boolean,
): Promise<ActionState> {
  if (away) return setAwayScheduled(hubId, null);
  return clearAwayMode(hubId);
}

/** @deprecated */
export async function setFanSpeed(
  hubId: string,
  speed: number,
): Promise<ActionState> {
  const pct = 25 + speed * 15;
  return setFanPct(hubId, pct, pct);
}

export async function setSaunaMode(
  hubId: string,
  active: boolean,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }
  await patchHubState(supabase, hubId, { sauna_mode: active });
  return queueCommand(hubId, "set_sauna_mode", { active });
}

export async function setTempSetpoint(
  hubId: string,
  tempC: number,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  if (!Number.isFinite(tempC) || tempC < 5 || tempC > 26) {
    return { error: "Lämpötila-asetus 5–26 °C." };
  }
  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }
  await patchHubState(supabase, hubId, { temp_setpoint_c: tempC });
  return queueCommand(hubId, "set_temp_setpoint", { temp_c: tempC });
}

export async function ackAirfiAlarms(hubId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }
  await patchHubState(supabase, hubId, {
    emergency_stop: false,
    freezing_alarm: false,
    machine_fault: false,
    airfi_errors: [],
    airfi_error_raw: 0,
  });
  return queueCommand(hubId, "ack_airfi_alarms", {});
}

export async function setFireplaceBypass(
  hubId: string,
  active: boolean,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }
  await patchHubState(supabase, hubId, { fireplace_active: active });
  return queueCommand(hubId, "set_fireplace_mode", { active });
}

export async function setFanSpeedLevel(
  hubId: string,
  level: number,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };
  if (!Number.isFinite(level) || level < 0 || level > 5) {
    return { error: "Nopeustaso 0–5." };
  }
  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }
  await patchHubState(supabase, hubId, { fan_speed_level: Math.round(level) });
  return queueCommand(hubId, "set_fan_speed_level", { level: Math.round(level) });
}

export async function deleteHub(hubId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Kirjaudu sisään." };

  if (!(await getOwnedHub(supabase, hubId, user.id))) {
    return { error: "Keskusyksikköä ei löydy." };
  }

  const { error } = await supabase.from("hubs").delete().eq("id", hubId);

  if (error) return { error: "Poisto epäonnistui." };

  revalidatePath("/");
  revalidateLaitteet();
  revalidatePath("/ilmanvaihto");
  return { ok: "Keskusyksikkö poistettu." };
}

// Yhteensopivuus
export const registerController = registerHub;
export const saveAutomationConfig = saveVentilationConfig;
export const deleteController = deleteHub;
