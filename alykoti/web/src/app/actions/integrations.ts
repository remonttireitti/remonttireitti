"use server";

import { revalidateLaitteet } from "@/lib/revalidate-laitteet";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { HubIntegrations, HubHomeDevice, HubState, ShellyDeviceConfig, TasmotaDeviceConfig } from "@/lib/types";
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

function wifiHostId(protocol: "shelly" | "tasmota", host: string): string {
  return `${protocol}:${host}`;
}

function purgeWifiHomeDevices(
  home: Record<string, HubHomeDevice>,
  protocol: "shelly" | "tasmota",
  host: string,
) {
  const prefix = `${protocol}:${host}:`;
  for (const key of Object.keys(home)) {
    if (key.startsWith(prefix)) delete home[key];
  }
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

function resolveShellyFromDiscovered(
  host: string,
  state: HubState,
  gen: 1 | 2,
  nameRaw: string,
  model?: string,
): { gen: 1 | 2; name: string; model?: string } {
  const discovered = (state.shelly_discovered ?? []).find((d) => d.host === host);
  if (!discovered) {
    return { gen, name: nameRaw.trim() || host, model };
  }
  return {
    gen: discovered.gen === 1 ? 1 : discovered.gen === 2 ? 2 : gen,
    name: nameRaw.trim() || discovered.name || host,
    model: discovered.model ?? model,
  };
}

export async function addShellyDevice(
  hostRaw: string,
  nameRaw: string,
  gen: 1 | 2 = 2,
  model?: string,
): Promise<DeviceActionState> {
  const host = normalizeHost(hostRaw);
  if (!host) return { error: "Virheellinen IP-osoite." };

  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const resolved = resolveShellyFromDiscovered(host, state, gen, nameRaw, model);
  const integrations: HubIntegrations = { ...(state.integrations ?? {}) };
  const devices = [...(integrations.shelly?.devices ?? [])];
  const id = wifiHostId("shelly", host);

  if (devices.some((d) => d.host === host)) {
    return { error: "Laite on jo listalla." };
  }

  const entry: ShellyDeviceConfig = {
    id,
    host,
    name: resolved.name,
    gen: resolved.gen,
    model: resolved.model,
  };
  devices.push(entry);
  integrations.shelly = { devices };

  const { error } = await ctx.supabase
    .from("hubs")
    .update({ state: { ...state, integrations } })
    .eq("id", ctx.hub.id);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidateLaitteet();
  return { ok: "Shelly lisätty — Yellow tunnistaa kanavat automaattisesti (~30 s)." };
}

export async function removeShellyDevice(deviceId: string): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const integrations: HubIntegrations = { ...(state.integrations ?? {}) };
  const removed = (integrations.shelly?.devices ?? []).find((d) => d.id === deviceId);
  const devices = (integrations.shelly?.devices ?? []).filter((d) => d.id !== deviceId);
  integrations.shelly = { devices };

  const homeDevices = { ...(state.home_devices ?? {}) };
  if (removed) purgeWifiHomeDevices(homeDevices, "shelly", removed.host);

  const { error } = await ctx.supabase
    .from("hubs")
    .update({ state: { ...state, integrations, home_devices: homeDevices } })
    .eq("id", ctx.hub.id);

  if (error) return { error: "Poisto epäonnistui." };

  revalidateLaitteet();
  return { ok: "Shelly poistettu." };
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

export async function addTasmotaDevice(
  hostRaw: string,
  nameRaw: string,
  model?: string,
): Promise<DeviceActionState> {
  const host = normalizeHost(hostRaw);
  if (!host) return { error: "Virheellinen IP-osoite." };

  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const integrations: HubIntegrations = { ...(state.integrations ?? {}) };
  const devices = [...(integrations.tasmota?.devices ?? [])];
  const id = wifiHostId("tasmota", host);

  if (devices.some((d) => d.host === host)) {
    return { error: "Laite on jo listalla." };
  }

  const entry: TasmotaDeviceConfig = { id, host, name: nameRaw.trim() || host, model };
  devices.push(entry);
  integrations.tasmota = { devices };

  const { error } = await ctx.supabase
    .from("hubs")
    .update({ state: { ...state, integrations } })
    .eq("id", ctx.hub.id);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidateLaitteet();
  return { ok: "Tasmota lisätty — Yellow tunnistaa kanavat automaattisesti (~30 s)." };
}

export async function removeTasmotaDevice(deviceId: string): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const integrations: HubIntegrations = { ...(state.integrations ?? {}) };
  const removed = (integrations.tasmota?.devices ?? []).find((d) => d.id === deviceId);
  const devices = (integrations.tasmota?.devices ?? []).filter((d) => d.id !== deviceId);
  integrations.tasmota = { devices };

  const homeDevices = { ...(state.home_devices ?? {}) };
  if (removed) purgeWifiHomeDevices(homeDevices, "tasmota", removed.host);

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

export async function connectAirthingsDevice(
  serial: string,
  nameRaw?: string,
): Promise<DeviceActionState> {
  const serialTrim = serial.trim();
  if (!serialTrim) return { error: "Valitse laite." };

  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const integrations: HubIntegrations = { ...(state.integrations ?? {}) };
  const devices = [...(integrations.airthings?.devices ?? [])];
  const id = `airthings:${serialTrim}`;

  if (devices.some((d) => d.serial === serialTrim)) {
    return { error: "Laite on jo yhdistetty." };
  }

  const entry = {
    id,
    serial: serialTrim,
    name: nameRaw?.trim() || "Airthings",
    enabled: true,
  };
  devices.push(entry);
  integrations.airthings = { devices };

  const { error } = await ctx.supabase
    .from("hubs")
    .update({ state: { ...state, integrations } })
    .eq("id", ctx.hub.id);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidateLaitteet();
  return { ok: "Airthings yhdistetty — mittaukset päivittyvät synkissä." };
}

export async function disconnectAirthingsDevice(deviceId: string): Promise<DeviceActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const integrations: HubIntegrations = { ...(state.integrations ?? {}) };
  const removed = (integrations.airthings?.devices ?? []).find((d) => d.id === deviceId);
  const devices = (integrations.airthings?.devices ?? []).filter((d) => d.id !== deviceId);
  integrations.airthings = { devices };

  const homeDevices = { ...(state.home_devices ?? {}) };
  if (removed) {
    delete homeDevices[removed.id];
  }

  const { error } = await ctx.supabase
    .from("hubs")
    .update({ state: { ...state, integrations, home_devices: homeDevices } })
    .eq("id", ctx.hub.id);

  if (error) return { error: "Poisto epäonnistui." };

  revalidateLaitteet();
  return { ok: "Airthings poistettu." };
}
