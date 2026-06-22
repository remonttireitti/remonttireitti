import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isDeviceTrigger,
  isElectricityPriceTrigger,
  type AutomationRule,
} from "@/lib/automation";
import { fetchElectricityPrices } from "@/lib/electricity-prices";
import {
  isPeriodActive,
  periodSlotKey,
  type ElectricityPricePeriod,
} from "@/lib/electricity-price-periods";
import { parseHubHomeDevices } from "@/lib/hub-lights";
import { parseHubConfig } from "@/lib/hubs";
import type { Hub, HubState } from "@/lib/types";

async function queueDeviceAction(
  supabase: SupabaseClient,
  hub: Hub,
  rule: AutomationRule,
): Promise<void> {
  const devices = parseHubHomeDevices(
    hub.state?.home_devices,
    hub.state?.lights,
    hub.state?.device_overrides,
  );

  for (const targetId of rule.action.target_ids) {
    const device = devices.find((d) => d.id === targetId);
    const payload: Record<string, unknown> = {
      id: targetId,
      on: rule.action.type !== "off",
      brightness:
        rule.action.type === "set_brightness" && rule.action.brightness_pct != null
          ? Math.round((rule.action.brightness_pct / 100) * 254)
          : null,
      automation_rule_id: rule.id,
    };

    if (rule.action.type === "off") payload.on = false;
    if (rule.action.type === "toggle") payload.on = !device?.on;

    if (device?.mqttSetTopic) payload.mqtt_set_topic = device.mqttSetTopic;
    if (device?.lockSetTopic) payload.lock_set_topic = device.lockSetTopic;

    const raw = hub.state?.home_devices?.[targetId];
    if (device?.protocol === "shelly" && raw?.host) {
      payload.host = raw.host;
      if (typeof raw.channel === "number") payload.channel = raw.channel;
      if (typeof raw.gen === "number") payload.gen = raw.gen;
    }
    if (device?.protocol === "tasmota" && raw?.host) {
      payload.host = raw.host;
      if (typeof raw.channel === "number") payload.channel = raw.channel;
    }

    await supabase.from("commands").insert({
      hub_id: hub.id,
      user_id: hub.user_id,
      command: "set_device",
      payload,
    });
  }
}

export async function runElectricityPriceAutomations(
  supabase: SupabaseClient,
  hub: Hub,
): Promise<{ fired: string[]; skipped: string[] }> {
  const config = parseHubConfig(hub.config);
  const periods = config.electricity_price_periods ?? [];
  const rules = (config.automations ?? []).filter((r) => r.enabled);
  const priceRules = rules.filter((r) => isElectricityPriceTrigger(r.trigger));

  if (priceRules.length === 0 || periods.length === 0) {
    return { fired: [], skipped: [] };
  }

  const prices = await fetchElectricityPrices();
  const current = prices.current;
  if (!current) return { fired: [], skipped: priceRules.map((r) => r.id) };

  const state = (hub.state ?? {}) as HubState;
  const fires = { ...(state.automation_price_fires ?? {}) };
  const fired: string[] = [];
  const skipped: string[] = [];

  for (const rule of priceRules) {
    const trigger = rule.trigger;
    if (!isElectricityPriceTrigger(trigger)) {
      skipped.push(rule.id);
      continue;
    }
    const period = periods.find((p) => p.id === trigger.period_id);
    if (!period) {
      skipped.push(rule.id);
      continue;
    }
    if (!isPeriodActive(period, prices)) {
      skipped.push(rule.id);
      continue;
    }

    const key = periodSlotKey(period.id, current.at);
    const fireKey = `${rule.id}:${key}`;
    if (fires[rule.id] === key) {
      skipped.push(rule.id);
      continue;
    }

    await queueDeviceAction(supabase, hub, rule);
    fires[rule.id] = key;
    fired.push(rule.id);
  }

  if (fired.length > 0) {
    await supabase
      .from("hubs")
      .update({
        state: {
          ...state,
          automation_price_fires: fires,
        },
      })
      .eq("id", hub.id);
  }

  return { fired, skipped };
}

export function filterDeviceRules(rules: AutomationRule[]): AutomationRule[] {
  return rules.filter((r) => isDeviceTrigger(r.trigger));
}

export function findPeriod(
  periods: ElectricityPricePeriod[],
  id: string,
): ElectricityPricePeriod | undefined {
  return periods.find((p) => p.id === id);
}
