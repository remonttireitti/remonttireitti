"use server";

import { revalidateLaitteet } from "@/lib/revalidate-laitteet";
import {
  newElectricityPeriodId,
  normalizeElectricityPricePeriods,
  type ElectricityPricePeriod,
} from "@/lib/electricity-price-periods";
import { fetchPrimaryHub, parseHubConfig } from "@/lib/hubs";
import type { HubConfig } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type PeriodActionState = {
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

async function savePeriods(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hubId: string,
  configRaw: unknown,
  periods: ElectricityPricePeriod[],
): Promise<PeriodActionState> {
  const config: HubConfig = {
    ...parseHubConfig(configRaw),
    electricity_price_periods: periods,
  };

  const { error } = await supabase.from("hubs").update({ config }).eq("id", hubId);
  if (error) return { error: "Tallennus epäonnistui." };
  revalidateLaitteet();
  return { ok: "Halvimmat jaksot tallennettu." };
}

export async function saveElectricityPricePeriod(input: {
  id?: string;
  name: string;
  mode: "cheapest_slots" | "below_cents";
  cheapest_slots?: number;
  below_cents?: number;
}): Promise<PeriodActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const name = input.name.trim();
  if (!name) return { error: "Anna jaksolle nimi." };

  const periods = normalizeElectricityPricePeriods(parseHubConfig(ctx.hub.config).electricity_price_periods);
  const id = input.id?.trim() || newElectricityPeriodId();

  const period: ElectricityPricePeriod = {
    id,
    name,
    mode: input.mode,
    cheapest_slots:
      input.mode === "cheapest_slots"
        ? Math.max(1, Math.min(96, Math.round(input.cheapest_slots ?? 8)))
        : undefined,
    below_cents:
      input.mode === "below_cents"
        ? Math.max(0, Math.round((input.below_cents ?? 5) * 100) / 100)
        : undefined,
  };

  const idx = periods.findIndex((p) => p.id === id);
  if (idx >= 0) periods[idx] = period;
  else periods.push(period);

  const { data: row } = await ctx.supabase
    .from("hubs")
    .select("config")
    .eq("id", ctx.hub.id)
    .single();

  return savePeriods(ctx.supabase, ctx.hub.id, row?.config, periods);
}

export async function deleteElectricityPricePeriod(periodId: string): Promise<PeriodActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const periods = normalizeElectricityPricePeriods(
    parseHubConfig(ctx.hub.config).electricity_price_periods,
  ).filter((p) => p.id !== periodId);

  const { data: row } = await ctx.supabase
    .from("hubs")
    .select("config")
    .eq("id", ctx.hub.id)
    .single();

  return savePeriods(ctx.supabase, ctx.hub.id, row?.config, periods);
}
