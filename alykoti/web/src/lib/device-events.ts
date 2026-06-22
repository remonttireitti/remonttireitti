import { parseHueMqttAction, hueMqttActionLabel, parseW100MqttAction, w100MqttActionLabel } from "@/lib/automation-trigger-profiles";
import {
  labelTriggerAction,
  triggerButtonForAction,
  triggerPressForAction,
} from "@/lib/automation-trigger-catalog";
import {
  PRESS_LABELS,
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
  return triggerPressForAction(action);
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
    const w100 = parseW100MqttAction(action);
    const hue = parseHueMqttAction(action);
    const button =
      typeof payload.button === "string" && payload.button.trim()
        ? payload.button.trim()
        : typeof payload.click === "string"
          ? payload.click.trim()
          : w100
            ? w100.button
            : hue
              ? hue.button
              : null;
    const press = pressForAction(action);
    const pressLabel = w100
      ? w100MqttActionLabel(action)
      : hue
        ? hueMqttActionLabel(action)
        : press
          ? PRESS_LABELS[press]
          : action;
    const label = button && !hue && !w100 ? `${button} · ${pressLabel}` : pressLabel;

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
  const epSeg = segments.length >= 2 ? segments[segments.length - 2] : null;
  const endpoint = epSeg && /^\d+$/.test(epSeg) ? Number.parseInt(epSeg, 10) : null;
  const on =
    value === true ||
    value === 1 ||
    value === "true" ||
    value === "1" ||
    value === "on" ||
    value === "ON";
  const off =
    value === false ||
    value === 0 ||
    value === "false" ||
    value === "0" ||
    value === "off" ||
    value === "OFF";

  let action: string | undefined;
  if (on) {
    action = endpoint != null ? `ep${endpoint}_on` : "on";
  } else if (off) {
    action = endpoint != null ? `ep${endpoint}_off` : "off";
  } else if (typeof value === "string" && value.trim()) {
    action = value.trim().replace(/-/g, "_");
  }

  const label = action
    ? labelTriggerAction(action)
    : `${segments[segments.length - 3] ?? "value"}: ${formatValue("value", value)}`;

  const hint: DeviceEventTriggerHint = {};
  if (action) {
    hint.action = action;
    hint.press = triggerPressForAction(action);
    if (endpoint != null) hint.button = String(endpoint);
  }

  return {
    at,
    label,
    topic,
    raw: { value, endpoint },
    triggerHint: Object.keys(hint).length ? hint : undefined,
  };
}

export function triggerHintToAutomationFields(hint: DeviceEventTriggerHint): {
  press: AutomationPressType;
  button: string | null;
  action: string | null;
} {
  const action = hint.action ?? null;
  return {
    press: hint.press ?? (action ? triggerPressForAction(action) : "short"),
    button: hint.button ?? (action ? triggerButtonForAction(action) : null),
    action,
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
