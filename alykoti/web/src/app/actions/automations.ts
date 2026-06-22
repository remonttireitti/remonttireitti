"use server";

import { revalidateLaitteet } from "@/lib/revalidate-laitteet";
import {
  normalizeAutomationRules,
  newRuleId,
  type AutomationActionType,
  type AutomationPressType,
  type LightAutomationRule,
} from "@/lib/automation";
import { fetchPrimaryHub, parseHubConfig } from "@/lib/hubs";
import type { HubConfig, HubState } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type AutomationActionState = {
  error?: string;
  ok?: string;
};

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

function readAutomationRules(config: unknown, state: HubState): LightAutomationRule[] {
  const fromConfig = normalizeAutomationRules(parseHubConfig(config).automations);
  if (fromConfig.length > 0) return fromConfig;
  return normalizeAutomationRules(state.automations);
}

async function saveRules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hubId: string,
  configRaw: unknown,
  rules: LightAutomationRule[],
): Promise<AutomationActionState> {
  const config: HubConfig = {
    ...parseHubConfig(configRaw),
    automations: rules,
  };

  const { error } = await supabase.from("hubs").update({ config }).eq("id", hubId);

  if (error) return { error: "Tallennus epäonnistui." };
  revalidateLaitteet();
  return { ok: "Automaatio tallennettu. Yellow päivittää säännöt seuraavassa synkissä (~30 s)." };
}

export async function saveAutomationRule(input: {
  id?: string;
  name: string;
  enabled: boolean;
  trigger_device_id: string;
  trigger_press: AutomationPressType;
  trigger_button?: string | null;
  action_type: AutomationActionType;
  target_ids: string[];
  brightness_pct?: number | null;
}): Promise<AutomationActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const name = input.name.trim();
  if (!name) return { error: "Anna säännölle nimi." };
  if (!input.trigger_device_id.includes(":")) {
    return { error: "Valitse laukaisin laitelistasta." };
  }
  if (input.target_ids.length === 0) return { error: "Valitse vähintään yksi kohde." };
  if (input.action_type === "set_brightness") {
    const pct = input.brightness_pct;
    if (pct == null || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      return { error: "Anna kirkkaus 0–100 %." };
    }
  }

  const state = (ctx.hub.state as HubState) ?? {};
  const rules = readAutomationRules(ctx.hub.config, state);
  const id = input.id?.trim() || newRuleId();

  const rule: LightAutomationRule = {
    id,
    name,
    enabled: input.enabled,
    trigger: {
      device_id: input.trigger_device_id,
      press: input.trigger_press,
      button: input.trigger_button?.trim() || null,
    },
    action: {
      type: input.action_type,
      target_ids: input.target_ids,
      brightness_pct:
        input.action_type === "set_brightness" && input.brightness_pct != null
          ? Math.round(input.brightness_pct)
          : null,
    },
  };

  const idx = rules.findIndex((r) => r.id === id);
  if (idx >= 0) rules[idx] = rule;
  else rules.push(rule);

  const { data: row } = await ctx.supabase
    .from("hubs")
    .select("config")
    .eq("id", ctx.hub.id)
    .single();

  return saveRules(ctx.supabase, ctx.hub.id, row?.config, rules);
}

export async function deleteAutomationRule(ruleId: string): Promise<AutomationActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const rules = readAutomationRules(ctx.hub.config, state).filter((r) => r.id !== ruleId);

  const { data: row } = await ctx.supabase
    .from("hubs")
    .select("config")
    .eq("id", ctx.hub.id)
    .single();

  return saveRules(ctx.supabase, ctx.hub.id, row?.config, rules);
}

export async function toggleAutomationRule(
  ruleId: string,
  enabled: boolean,
): Promise<AutomationActionState> {
  const ctx = await requireHub();
  if (ctx.error || !ctx.supabase || !ctx.hub) return { error: ctx.error ?? "Virhe." };

  const state = (ctx.hub.state as HubState) ?? {};
  const rules = readAutomationRules(ctx.hub.config, state);
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return { error: "Sääntöä ei löydy." };
  rule.enabled = enabled;

  const { data: row } = await ctx.supabase
    .from("hubs")
    .select("config")
    .eq("id", ctx.hub.id)
    .single();

  return saveRules(ctx.supabase, ctx.hub.id, row?.config, rules);
}
