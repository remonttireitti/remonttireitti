/** Automaatiosäännöt — laite- ja sähköhintalaukaisimet. */

import type { ElectricityPricePeriod } from "@/lib/electricity-price-periods";
import { hueMqttActionLabel, parseHueMqttAction } from "@/lib/automation-trigger-profiles";

export type AutomationPressType = "short" | "long" | "double";

export type AutomationActionType =
  | "on"
  | "off"
  | "toggle"
  | "brightness_up"
  | "brightness_down"
  | "set_brightness"
  | "color_next"
  | "color_prev"
  | "lock"
  | "unlock"
  | "toggle_lock";

export type DeviceAutomationTrigger = {
  kind: "device";
  /** zigbee:laite_nimi tai zwave:nodeId */
  device_id: string;
  press: AutomationPressType;
  /** Esim. button_1, left — tyhjä = kaikki painikkeet */
  button?: string | null;
  /** Tarkka MQTT action (single, hold…) — tyhjä = painallustyypin mukainen */
  action?: string | null;
};

export type ElectricityPriceAutomationTrigger = {
  kind: "electricity_price";
  /** Viittaus hubs.config.electricity_price_periods -listaan */
  period_id: string;
};

export type AutomationTrigger = DeviceAutomationTrigger | ElectricityPriceAutomationTrigger;

export type AutomationAction = {
  type: AutomationActionType;
  /** Valojen device_id:t (zigbee:, zwave:, shelly:, tasmota:) */
  target_ids: string[];
  /** 0–100 % set_brightness */
  brightness_pct?: number | null;
};

export type AutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  action: AutomationAction;
};

/** @deprecated käytä AutomationRule */
export type LightAutomationRule = AutomationRule;

export const PRESS_LABELS: Record<AutomationPressType, string> = {
  short: "Lyhyt painallus",
  long: "Pitkä painallus",
  double: "Tupla",
};

export const ACTION_LABELS: Record<AutomationActionType, string> = {
  on: "Päälle",
  off: "Pois",
  toggle: "Vaihda",
  brightness_up: "Kirkasta",
  brightness_down: "Himmennä",
  set_brightness: "Aseta kirkkaus",
  color_next: "Seuraava väri",
  color_prev: "Edellinen väri",
  lock: "Lukitse",
  unlock: "Avaa",
  toggle_lock: "Vaihda lukko",
};

export const TRIGGER_KIND_LABELS = {
  device: "Laite",
  electricity_price: "Sähkön hinta",
} as const;

/** Zigbee2MQTT action-arvot joita pidetään lyhyenä painalluksena. */
export const SHORT_PRESS_ACTIONS = new Set([
  "single",
  "single_click",
  "click",
  "on",
  "off",
  "toggle",
  "1_click",
  "2_click",
  "3_click",
  "4_click",
  "left_click",
  "right_click",
  "up",
  "down",
  "open",
  "close",
  "stop",
]);

/** Pitkä painallus / hold. */
export const LONG_PRESS_ACTIONS = new Set([
  "hold",
  "long",
  "long_press",
  "long_click",
  "release",
  "1_hold",
  "2_hold",
  "3_hold",
  "4_hold",
  "left_hold",
  "right_hold",
]);

/** Tupla. */
export const DOUBLE_PRESS_ACTIONS = new Set([
  "double",
  "double_click",
  "1_double",
  "2_double",
  "3_double",
  "4_double",
  "left_double",
  "right_double",
]);

export function actionsForPress(press: AutomationPressType): Set<string> {
  switch (press) {
    case "short":
      return SHORT_PRESS_ACTIONS;
    case "long":
      return LONG_PRESS_ACTIONS;
    case "double":
      return DOUBLE_PRESS_ACTIONS;
  }
}

function parseTrigger(raw: Record<string, unknown>): AutomationTrigger | null {
  const kind = raw.kind ?? raw.type;
  if (kind === "electricity_price") {
    const period_id = raw.period_id;
    if (typeof period_id !== "string" || !period_id.trim()) return null;
    return { kind: "electricity_price", period_id: period_id.trim() };
  }

  if (typeof raw.device_id !== "string") return null;
  const press = raw.press;
  if (press !== "short" && press !== "long" && press !== "double") return null;

  return {
    kind: "device",
    device_id: raw.device_id,
    press,
    button:
      typeof raw.button === "string" && raw.button.trim() ? raw.button.trim() : null,
    action:
      typeof raw.action === "string" && raw.action.trim() ? raw.action.trim() : null,
  };
}

function parseAction(raw: Record<string, unknown> | undefined): AutomationAction | null {
  if (!raw || typeof raw.type !== "string" || !Array.isArray(raw.target_ids)) return null;
  const type = raw.type;
  const validTypes: AutomationActionType[] = [
    "on",
    "off",
    "toggle",
    "brightness_up",
    "brightness_down",
    "set_brightness",
    "color_next",
    "color_prev",
    "lock",
    "unlock",
    "toggle_lock",
  ];
  if (!validTypes.includes(type as AutomationActionType)) return null;

  return {
    type: type as AutomationActionType,
    target_ids: raw.target_ids.filter((id): id is string => typeof id === "string"),
    brightness_pct:
      typeof raw.brightness_pct === "number" && Number.isFinite(raw.brightness_pct)
        ? Math.max(0, Math.min(100, Math.round(raw.brightness_pct)))
        : null,
  };
}

export function normalizeAutomationRules(raw: unknown): AutomationRule[] {
  if (!Array.isArray(raw)) return [];
  const out: AutomationRule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const triggerRaw = r.trigger as Record<string, unknown> | undefined;
    if (
      typeof r.id !== "string" ||
      typeof r.name !== "string" ||
      !triggerRaw
    ) {
      continue;
    }
    const trigger = parseTrigger(triggerRaw);
    const action = parseAction(r.action as Record<string, unknown> | undefined);
    if (!trigger || !action) continue;

    out.push({
      id: r.id,
      name: r.name,
      enabled: r.enabled !== false,
      trigger,
      action,
    });
  }
  return out;
}

export function isDeviceTrigger(trigger: AutomationTrigger): trigger is DeviceAutomationTrigger {
  return trigger.kind === "device";
}

export function isElectricityPriceTrigger(
  trigger: AutomationTrigger,
): trigger is ElectricityPriceAutomationTrigger {
  return trigger.kind === "electricity_price";
}

export function triggerSummary(
  trigger: AutomationTrigger,
  deviceName: string,
  period?: ElectricityPricePeriod,
): string {
  if (isElectricityPriceTrigger(trigger)) {
    return period ? `Sähkö · ${period.name}` : `Sähkö · ${trigger.period_id}`;
  }
  const parts = [deviceName, PRESS_LABELS[trigger.press]];
  if (trigger.button) parts.push(trigger.button);
  if (trigger.action) {
    const hue = parseHueMqttAction(trigger.action);
    parts.push(hue ? hueMqttActionLabel(trigger.action) : `action: ${trigger.action}`);
  }
  return parts.join(" · ");
}

export function newRuleId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Yellow-yhteensopiva trigger ilman kind-kenttää. */
export function triggerForYellow(trigger: AutomationTrigger): Record<string, unknown> {
  if (isElectricityPriceTrigger(trigger)) {
    return { kind: "electricity_price", period_id: trigger.period_id };
  }
  return {
    device_id: trigger.device_id,
    press: trigger.press,
    button: trigger.button ?? null,
    action: trigger.action ?? null,
  };
}
