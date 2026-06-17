"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { validateVentilationConfig } from "@/lib/hubs";
import { DEFAULT_VENTILATION_CONFIG, type VentilationConfig } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: string; deviceToken?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
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
  revalidatePath("/keskusyksikko");
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

  const { error } = await supabase
    .from("hubs")
    .update({ config })
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

  const { error } = await supabase.from("commands").insert({
    hub_id: hubId,
    user_id: user.id,
    command,
    payload,
  });

  if (error) return { error: "Komennon lähetys epäonnistui." };

  if (command === "set_mode") {
    const mode = payload.mode;
    const allowed = ["auto", "manual", "fireplace", "hood"];
    const next = allowed.includes(mode as string) ? mode : "auto";
    await supabase.from("hubs").update({ control_mode: next }).eq("id", hubId);
  }

  revalidatePath("/ilmanvaihto");
  revalidatePath("/ilmanvaihto/asetukset");
  return { ok: "Komento lähetetty." };
}

export async function setFanPct(
  hubId: string,
  supplyPct: number,
  exhaustPct: number,
): Promise<ActionState> {
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
  await queueCommand(hubId, "set_mode", { mode: "manual" });
  return queueCommand(hubId, "set_fan_pct", {
    supply_pct: Math.round(supplyPct),
    exhaust_pct: Math.round(exhaustPct),
    fireplace: false,
  });
}

export async function setRunMode(
  hubId: string,
  mode: "auto" | "manual" | "fireplace" | "hood",
): Promise<ActionState> {
  return queueCommand(hubId, "set_mode", { mode });
}

/** @deprecated */
export async function setFanSpeed(
  hubId: string,
  speed: number,
): Promise<ActionState> {
  const pct = 25 + speed * 15;
  return setFanPct(hubId, pct, pct);
}

export async function setAutoMode(hubId: string): Promise<ActionState> {
  return queueCommand(hubId, "set_mode", { mode: "auto" });
}

export async function setAwayMode(
  hubId: string,
  away: boolean,
): Promise<ActionState> {
  return queueCommand(hubId, "set_away", { away });
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
  revalidatePath("/keskusyksikko");
  revalidatePath("/ilmanvaihto");
  return { ok: "Keskusyksikkö poistettu." };
}

// Yhteensopivuus
export const registerController = registerHub;
export const saveAutomationConfig = saveVentilationConfig;
export const deleteController = deleteHub;
