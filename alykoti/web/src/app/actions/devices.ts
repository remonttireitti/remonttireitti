"use server";

import { revalidateLaitteet } from "@/lib/revalidate-laitteet";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { HubDeviceOverride, HubState } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type DeviceActionState = {
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

  return { supabase, hub, user, error: null };
}

async function queueHubCommand(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hubId: string,
  userId: string,
  command: string,
  payload: Record<string, unknown> = {},
): Promise<DeviceActionState> {
  const { error } = await supabase.from("commands").insert({
    hub_id: hubId,
    user_id: userId,
    command,
    payload,
  });
  if (error) return { error: "Komennon lähetys epäonnistui." };
  return { ok: "Komento lähetetty Yellowille." };
}

export async function updateDeviceOverride(
  deviceId: string,
  patch: HubDeviceOverride,
): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const overrides = { ...(state.device_overrides ?? {}) };
  overrides[deviceId] = { ...overrides[deviceId], ...patch };

  const { error } = await ctx.supabase
    .from("hubs")
    .update({ state: { ...state, device_overrides: overrides } })
    .eq("id", ctx.hub.id);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidateLaitteet();
  return { ok: "Tallennettu." };
}

export async function renameHubDevice(
  deviceId: string,
  newName: string,
  nodeId?: number,
): Promise<DeviceActionState> {
  const name = newName.trim();
  if (!name) return { error: "Nimi vaaditaan." };

  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub || !ctx.user) return { error: ctx.error ?? "Virhe." };

  await updateDeviceOverride(deviceId, { display_name: name });

  const payload: Record<string, unknown> = { id: deviceId, name };
  if (typeof nodeId === "number") payload.node_id = nodeId;

  const queued = await queueHubCommand(
    ctx.supabase,
    ctx.hub.id,
    ctx.user.id,
    "rename_device",
    payload,
  );

  revalidateLaitteet();
  return queued.ok
    ? { ok: "Nimi tallennettu — Yellow päivittää laitteen." }
    : queued;
}

export async function startZigbeePairing(seconds = 120): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub || !ctx.user) return { error: ctx.error ?? "Virhe." };

  return queueHubCommand(ctx.supabase, ctx.hub.id, ctx.user.id, "zigbee_permit_join", {
    seconds,
  });
}

export async function startZwaveInclusion(): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub || !ctx.user) return { error: ctx.error ?? "Virhe." };

  return queueHubCommand(ctx.supabase, ctx.hub.id, ctx.user.id, "zwave_start_inclusion");
}

export async function stopZwaveInclusion(): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub || !ctx.user) return { error: ctx.error ?? "Virhe." };

  return queueHubCommand(ctx.supabase, ctx.hub.id, ctx.user.id, "zwave_stop_inclusion");
}
