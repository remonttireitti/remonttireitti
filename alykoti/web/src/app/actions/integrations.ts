"use server";

import { revalidateLaitteet } from "@/lib/revalidate-laitteet";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { HubIntegrations, HubState, ShellyDeviceConfig, TasmotaDeviceConfig } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type DeviceActionState = {
  error?: string;
  ok?: string;
};

function normalizeHost(raw: string): string | null {
  const host = raw.trim().replace(/^https?:\/\//, "").split("/")[0]?.split(":")[0];
  if (!host || !/^[\d.a-zA-Z-]+$/.test(host)) return null;
  return host;
}

function shellyId(host: string, channel = 0): string {
  return `shelly:${host}:${channel}`;
}

async function requireHub() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." as const, supabase: null, hub: null, user: null };

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) return { error: "Keskusyksikköä ei löydy." as const, supabase: null, hub: null, user: null };

  return { supabase, hub, user, error: null };
}

export async function addShellyDevice(
  hostRaw: string,
  nameRaw: string,
  channel = 0,
  gen: 1 | 2 = 2,
  model?: string,
): Promise<DeviceActionState> {
  const host = normalizeHost(hostRaw);
  if (!host) return { error: "Virheellinen IP-osoite." };

  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const integrations: HubIntegrations = { ...(state.integrations ?? {}) };
  const devices = [...(integrations.shelly?.devices ?? [])];
  const id = shellyId(host, channel);

  if (devices.some((d) => d.id === id)) {
    return { error: "Laite on jo listalla." };
  }

  const entry: ShellyDeviceConfig = {
    id,
    host,
    channel,
    name: nameRaw.trim() || host,
    gen,
    model,
  };
  devices.push(entry);
  integrations.shelly = { devices };

  const { error } = await ctx.supabase
    .from("hubs")
    .update({ state: { ...state, integrations } })
    .eq("id", ctx.hub.id);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidateLaitteet();
  return { ok: "Shelly lisätty — Yellow hakee tilan seuraavassa synkissä." };
}

export async function removeShellyDevice(deviceId: string): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const integrations: HubIntegrations = { ...(state.integrations ?? {}) };
  const devices = (integrations.shelly?.devices ?? []).filter((d) => d.id !== deviceId);
  integrations.shelly = { devices };

  const homeDevices = { ...(state.home_devices ?? {}) };
  delete homeDevices[deviceId];

  const { error } = await ctx.supabase
    .from("hubs")
    .update({ state: { ...state, integrations, home_devices: homeDevices } })
    .eq("id", ctx.hub.id);

  if (error) return { error: "Poisto epäonnistui." };

  revalidateLaitteet();
  return { ok: "Shelly poistettu." };
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

export async function discoverShellyDevices(): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub || !ctx.user) return { error: ctx.error ?? "Virhe." };

  return queueHubCommand(ctx.supabase, ctx.hub.id, ctx.user.id, "shelly_discover", {});
}

export async function probeShellyHost(hostRaw: string): Promise<DeviceActionState> {
  const host = normalizeHost(hostRaw);
  if (!host) return { error: "Virheellinen IP-osoite." };

  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub || !ctx.user) return { error: ctx.error ?? "Virhe." };

  return queueHubCommand(ctx.supabase, ctx.hub.id, ctx.user.id, "shelly_probe", { host });
}

function tasmotaId(host: string, channel = 0): string {
  return `tasmota:${host}:${channel}`;
}

export async function addTasmotaDevice(
  hostRaw: string,
  nameRaw: string,
  channel = 0,
  model?: string,
): Promise<DeviceActionState> {
  const host = normalizeHost(hostRaw);
  if (!host) return { error: "Virheellinen IP-osoite." };

  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const integrations: HubIntegrations = { ...(state.integrations ?? {}) };
  const devices = [...(integrations.tasmota?.devices ?? [])];
  const id = tasmotaId(host, channel);

  if (devices.some((d) => d.id === id)) {
    return { error: "Laite on jo listalla." };
  }

  const entry: TasmotaDeviceConfig = {
    id,
    host,
    channel,
    name: nameRaw.trim() || host,
    model,
  };
  devices.push(entry);
  integrations.tasmota = { devices };

  const { error } = await ctx.supabase
    .from("hubs")
    .update({ state: { ...state, integrations } })
    .eq("id", ctx.hub.id);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidateLaitteet();
  return { ok: "Tasmota lisätty — Yellow hakee tilan seuraavassa synkissä." };
}

export async function removeTasmotaDevice(deviceId: string): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const integrations: HubIntegrations = { ...(state.integrations ?? {}) };
  const devices = (integrations.tasmota?.devices ?? []).filter((d) => d.id !== deviceId);
  integrations.tasmota = { devices };

  const homeDevices = { ...(state.home_devices ?? {}) };
  delete homeDevices[deviceId];

  const { error } = await ctx.supabase
    .from("hubs")
    .update({ state: { ...state, integrations, home_devices: homeDevices } })
    .eq("id", ctx.hub.id);

  if (error) return { error: "Poisto epäonnistui." };

  revalidateLaitteet();
  return { ok: "Tasmota poistettu." };
}

export async function discoverTasmotaDevices(): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub || !ctx.user) return { error: ctx.error ?? "Virhe." };

  return queueHubCommand(ctx.supabase, ctx.hub.id, ctx.user.id, "tasmota_discover", {});
}

export async function probeTasmotaHost(hostRaw: string): Promise<DeviceActionState> {
  const host = normalizeHost(hostRaw);
  if (!host) return { error: "Virheellinen IP-osoite." };

  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub || !ctx.user) return { error: ctx.error ?? "Virhe." };

  return queueHubCommand(ctx.supabase, ctx.hub.id, ctx.user.id, "tasmota_probe", { host });
}
