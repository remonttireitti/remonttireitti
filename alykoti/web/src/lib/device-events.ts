import { parseHueMqttAction, hueMqttActionLabel } from "@/lib/automation-trigger-profiles";
import {
  actionsForPress,
  DOUBLE_PRESS_ACTIONS,
  LONG_PRESS_ACTIONS,
  PRESS_LABELS,
  SHORT_PRESS_ACTIONS,
  type AutomationPressType,
} from "@/lib/automation";

export type DeviceEventTriggerHint = {
  press?: AutomationPressType;
  button?: string | null;
  action?: string;
};

export type DeviceLiveEvent = {
  at: string;
  label: string;
  topic: string;
  raw: Record<string, unknown>;
  triggerHint?: DeviceEventTriggerHint;
};

function pressForAction(action: string): AutomationPressType | undefined {
  const normalized = action.trim().replace(/-/g, "_");
  const hue = parseHueMqttAction(normalized);
  if (hue) {
    if (hue.gesture === "hold") return "long";
    if (hue.gesture === "hold_release" || hue.gesture === "press_release") return "short";
    if (hue.gesture === "press") return "short";
  }
  const a = normalized.toLowerCase();
  if (SHORT_PRESS_ACTIONS.has(a)) return "short";
  if (LONG_PRESS_ACTIONS.has(a)) return "long";
  if (DOUBLE_PRESS_ACTIONS.has(a)) return "double";
  for (const press of ["short", "long", "double"] as AutomationPressType[]) {
    const aliases = actionsForPress(press);
    for (const alias of aliases) {
      if (a === alias || a.endsWith(`_${alias}`) || a.startsWith(`${alias}_`)) {
        return press;
      }
    }
  }
  return undefined;
}

function formatValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "kyllä" : "ei";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  return JSON.stringify(value);
}

export function formatZigbeeEvent(payload: Record<string, unknown>): DeviceLiveEvent | null {
  const at = new Date().toISOString();

  if (typeof payload.action === "string" && payload.action.trim()) {
    const action = payload.action.trim().replace(/-/g, "_");
    const hue = parseHueMqttAction(action);
    const button =
      typeof payload.button === "string" && payload.button.trim()
        ? payload.button.trim()
        : typeof payload.click === "string"
          ? payload.click.trim()
          : hue
            ? hue.button
            : null;
    const press = pressForAction(action);
    const pressLabel = hue
      ? hueMqttActionLabel(action)
      : press
        ? PRESS_LABELS[press]
        : action;
    const label = button && !hue ? `${button} · ${pressLabel}` : pressLabel;

    return {
      at,
      label,
      topic: "",
      raw: payload,
      triggerHint: {
        press,
        button,
        action,
      },
    };
  }

  const parts: string[] = [];
  if (payload.state != null) parts.push(`state: ${formatValue("state", payload.state)}`);
  if (payload.brightness != null) parts.push(`brightness: ${formatValue("brightness", payload.brightness)}`);
  if (payload.color != null) parts.push(`color: ${formatValue("color", payload.color)}`);
  if (payload.color_temp != null) parts.push(`color_temp: ${formatValue("color_temp", payload.color_temp)}`);
  if (payload.contact != null) parts.push(`contact: ${formatValue("contact", payload.contact)}`);
  if (payload.occupancy != null) parts.push(`occupancy: ${formatValue("occupancy", payload.occupancy)}`);
  if (payload.temperature != null) parts.push(`temperature: ${formatValue("temperature", payload.temperature)}`);
  if (payload.humidity != null) parts.push(`humidity: ${formatValue("humidity", payload.humidity)}`);
  if (payload.battery != null) parts.push(`battery: ${formatValue("battery", payload.battery)}`);

  if (parts.length === 0) {
    const keys = Object.keys(payload).filter((k) => payload[k] != null);
    if (keys.length === 0) return null;
    if (keys.length <= 3) {
      return {
        at,
        label: keys.map((k) => `${k}: ${formatValue(k, payload[k])}`).join(" · "),
        topic: "",
        raw: payload,
      };
    }
    return {
      at,
      label: keys.slice(0, 4).map((k) => `${k}: ${formatValue(k, payload[k])}`).join(" · ") + "…",
      topic: "",
      raw: payload,
    };
  }

  return {
    at,
    label: parts.join(" · "),
    topic: "",
    raw: payload,
  };
}

export function formatZwaveEvent(topic: string, value: unknown): DeviceLiveEvent | null {
  const at = new Date().toISOString();
  const segments = topic.split("/");
  const prop = segments.length >= 2 ? segments[segments.length - 2] : "value";
  const label = `${prop}: ${formatValue(prop, value)}`;

  const hint: DeviceEventTriggerHint = {};
  const v = String(value).toLowerCase();
  if (v === "true" || v === "1" || v === "on") {
    hint.action = "on";
    hint.press = "short";
  } else if (v === "false" || v === "0" || v === "off") {
    hint.action = "off";
    hint.press = "short";
  }

  return {
    at,
    label,
    topic,
    raw: { value },
    triggerHint: Object.keys(hint).length ? hint : undefined,
  };
}

export function triggerHintToAutomationFields(hint: DeviceEventTriggerHint): {
  press: AutomationPressType;
  button: string | null;
  action: string | null;
} {
  return {
    press: hint.press ?? "short",
    button: hint.button ?? null,
    action: hint.action ?? null,
  };
}

/** Yellow synkki → DeviceLiveEvent (ei vaadi suoraa MQTT-yhteyttä Vercelistä). */
export function hubDeviceEventsToLive(
  raw: unknown,
  deviceId: string,
): DeviceLiveEvent[] {
  if (!raw || typeof raw !== "object") return [];
  const bucket = (raw as Record<string, unknown>)[deviceId];
  if (!Array.isArray(bucket)) return [];
  const out: DeviceLiveEvent[] = [];
  for (const item of bucket) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const payload =
      row.raw && typeof row.raw === "object" && !Array.isArray(row.raw)
        ? (row.raw as Record<string, unknown>)
        : {};
    if (typeof row.action === "string") payload.action = row.action;
    if (typeof row.button === "string") payload.button = row.button;
    const at = typeof row.at === "string" ? row.at : new Date().toISOString();
    const evt = formatZigbeeEvent(payload);
    if (evt) {
      out.push({ ...evt, at, topic: "yellow/hub" });
    }
  }
  return out;
}
