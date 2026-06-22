/** Zigbee-kytkin → valo -automaatiot */

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

export type LightAutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    /** zigbee:laite_nimi */
    device_id: string;
    press: AutomationPressType;
    /** Esim. button_1, left — tyhjä = kaikki painikkeet */
    button?: string | null;
  };
  action: {
    type: AutomationActionType;
    /** Valojen device_id:t (zigbee:, zwave:, shelly:, tasmota:) */
    target_ids: string[];
    /** 0–100 % set_brightness */
    brightness_pct?: number | null;
  };
};

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

export function normalizeAutomationRules(raw: unknown): LightAutomationRule[] {
  if (!Array.isArray(raw)) return [];
  const out: LightAutomationRule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const trigger = r.trigger as Record<string, unknown> | undefined;
    const action = r.action as Record<string, unknown> | undefined;
    if (
      typeof r.id !== "string" ||
      typeof r.name !== "string" ||
      !trigger ||
      typeof trigger.device_id !== "string" ||
      !action ||
      typeof action.type !== "string" ||
      !Array.isArray(action.target_ids)
    ) {
      continue;
    }
    const press = trigger.press;
    if (press !== "short" && press !== "long" && press !== "double") continue;
    const type = action.type;
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
    if (!validTypes.includes(type as AutomationActionType)) continue;

    out.push({
      id: r.id,
      name: r.name,
      enabled: r.enabled !== false,
      trigger: {
        device_id: trigger.device_id,
        press,
        button:
          typeof trigger.button === "string" && trigger.button.trim()
            ? trigger.button.trim()
            : null,
      },
      action: {
        type: type as AutomationActionType,
        target_ids: action.target_ids.filter((id): id is string => typeof id === "string"),
        brightness_pct:
          typeof action.brightness_pct === "number" && Number.isFinite(action.brightness_pct)
            ? Math.max(0, Math.min(100, Math.round(action.brightness_pct)))
            : null,
      },
    });
  }
  return out;
}

export function newRuleId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
