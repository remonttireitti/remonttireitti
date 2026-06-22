/** Philips Hue 4-painike (on/off/ylös/alas) — Zigbee2MQTT action-muoto. */

export const HUE_4BTN_BUTTONS = [
  { id: "on", label: "On" },
  { id: "off", label: "Off" },
  { id: "up", label: "Ylös" },
  { id: "down", label: "Alas" },
] as const;

/** Kaikki Zigbee2MQTT-eleet Hue 4-painikkeelle. */
export const HUE_4BTN_GESTURES = [
  { id: "press", label: "Painallus" },
  { id: "hold", label: "Pito" },
  { id: "press_release", label: "Painallus päättyi" },
  { id: "hold_release", label: "Pito päättyi" },
] as const;

/** @deprecated käytä HUE_4BTN_GESTURES */
export const HUE_4BTN_GESTURES_UI = HUE_4BTN_GESTURES;

export type Hue4BtnButton = (typeof HUE_4BTN_BUTTONS)[number]["id"];
export type Hue4BtnGesture = (typeof HUE_4BTN_GESTURES)[number]["id"];
export type Hue4BtnGestureUi = Hue4BtnGesture;

const HUE_4BTN_MODELS = new Set([
  "324131092621",
  "929002398602",
  "RWL020",
  "RWL021",
  "RWL022",
  "RML004",
]);

const HUE_ACTION_RE =
  /^(on|off|up|down)_(press|hold|press_release|hold_release|hold_released)$/i;

function normalizeHueGesture(gesture: string): Hue4BtnGesture {
  const g = gesture.toLowerCase();
  if (g === "hold_released") return "hold_release";
  return g as Hue4BtnGesture;
}

export function hueMqttAction(button: string, gesture: string): string {
  const g = normalizeHueGesture(gesture);
  return `${button.toLowerCase()}_${g}`;
}

/** Kaikki 16 Hue MQTT -actionia (on_press … down_hold_release). */
export const HUE_4BTN_MQTT_ACTIONS: string[] = HUE_4BTN_BUTTONS.flatMap((btn) =>
  HUE_4BTN_GESTURES.map((g) => hueMqttAction(btn.id, g.id)),
);

export function parseHueMqttAction(
  action: string,
): { button: Hue4BtnButton; gesture: Hue4BtnGesture } | null {
  const normalized = action.trim().replace(/-/g, "_");
  const m = HUE_ACTION_RE.exec(normalized);
  if (!m) return null;
  return {
    button: m[1].toLowerCase() as Hue4BtnButton,
    gesture: normalizeHueGesture(m[2]),
  };
}

export function hueGestureFromParsed(
  gesture: Hue4BtnGesture | undefined,
): Hue4BtnGestureUi {
  if (gesture && HUE_4BTN_GESTURES.some((g) => g.id === gesture)) {
    return gesture;
  }
  return "press";
}

export function isHue4ButtonRemote(
  model?: string | null,
  manufacturer?: string | null,
  description?: string | null,
): boolean {
  const m = (model ?? "").toUpperCase().replace(/\s/g, "");
  if (HUE_4BTN_MODELS.has(m)) return true;
  if (/^RWL0/.test(m)) return true;
  if (/^RML004/.test(m)) return true;
  const mf = (manufacturer ?? "").toLowerCase();
  const desc = (description ?? "").toLowerCase();
  if (
    (mf.includes("philips") || mf.includes("signify")) &&
    (desc.includes("hue dimmer") || desc.includes("dimmer switch") || m.includes("RWL"))
  ) {
    return true;
  }
  return false;
}

export type AutomationTriggerProfile = "hue_4btn" | "w100_3btn" | "zigbee_button" | "zwave" | "generic";

export function triggerProfileForDevice(device: {
  id?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  protocol?: string | null;
  kind?: string | null;
}): AutomationTriggerProfile {
  if (isHue4ButtonRemote(device.model, device.manufacturer, device.description)) {
    return "hue_4btn";
  }
  if (isW100ClimateSensor(device.model, device.manufacturer, device.description)) {
    return "w100_3btn";
  }
  const id = device.id ?? "";
  const protocol = (device.protocol ?? "").toLowerCase();
  if (protocol === "zwave" || id.startsWith("zwave:")) return "zwave";
  if (protocol === "zigbee" || id.startsWith("zigbee:")) return "zigbee_button";
  return "generic";
}

/** Yellow-yhteensopiva press-kenttä kun action on täysi Hue-merkkijono. */
export function hueGestureToPress(gesture: Hue4BtnGesture): "short" | "long" {
  if (gesture === "hold") return "long";
  return "short";
}

/** Suositeltu Hue-kaukosäätimen painike+ele toiminnolle. */
export function recommendedHueTrigger(
  actionType: string,
): { button: Hue4BtnButton; gesture: Hue4BtnGesture } | null {
  switch (actionType) {
    case "brightness_up":
      return { button: "up", gesture: "press" };
    case "brightness_down":
      return { button: "down", gesture: "press" };
    case "color_next":
      return { button: "on", gesture: "hold_release" };
    case "color_prev":
      return { button: "off", gesture: "hold_release" };
    case "on":
      return { button: "on", gesture: "press" };
    case "off":
      return { button: "off", gesture: "press" };
    case "toggle":
      return { button: "on", gesture: "press" };
    default:
      return null;
  }
}

export function hueTriggerFields(
  button: Hue4BtnButton,
  gesture: Hue4BtnGesture,
): { press: "short" | "long"; button: null; action: string } {
  return {
    press: hueGestureToPress(gesture),
    button: null,
    action: hueMqttAction(button, gesture),
  };
}

export function hueMqttActionLabel(action: string): string {
  const parsed = parseHueMqttAction(action);
  if (!parsed) return action;
  const btn = HUE_4BTN_BUTTONS.find((b) => b.id === parsed.button)?.label ?? parsed.button;
  const ges =
    HUE_4BTN_GESTURES.find((g) => g.id === parsed.gesture)?.label ?? parsed.gesture;
  return `${btn} · ${ges}`;
}

/** Aqara W100 / TH-S04D — kolmipainike (+ / keskus / −). */

export const W100_BUTTONS = [
  { id: "plus", label: "+" },
  { id: "center", label: "Keskus" },
  { id: "minus", label: "−" },
] as const;

export const W100_GESTURES = [
  { id: "single", label: "Lyhyt" },
  { id: "double", label: "Tupla" },
  { id: "hold", label: "Pito" },
  { id: "release", label: "Päästä" },
] as const;

export type W100Button = (typeof W100_BUTTONS)[number]["id"];
export type W100Gesture = (typeof W100_GESTURES)[number]["id"];

const W100_MODELS = new Set(["TH-S04D"]);

const W100_ACTION_RE =
  /^(single|double|hold|release)_(plus|center|minus)$|^W100_PMTSD_request$/i;

export const W100_MQTT_ACTIONS: string[] = [
  "W100_PMTSD_request",
  ...W100_BUTTONS.flatMap((btn) =>
    W100_GESTURES.map((g) => `${g.id}_${btn.id}`),
  ),
];

export function parseW100MqttAction(
  action: string,
): { button: W100Button; gesture: W100Gesture } | null {
  const normalized = action.trim().replace(/-/g, "_");
  if (/^W100_PMTSD_request$/i.test(normalized)) return null;
  const m = /^(single|double|hold|release)_(plus|center|minus)$/i.exec(normalized);
  if (!m) return null;
  return {
    gesture: m[1].toLowerCase() as W100Gesture,
    button: m[2].toLowerCase() as W100Button,
  };
}

export function w100MqttActionLabel(action: string): string {
  if (/^W100_PMTSD_request$/i.test(action.trim())) return "PMTSD-pyyntö";
  const parsed = parseW100MqttAction(action);
  if (!parsed) return action;
  const btn = W100_BUTTONS.find((b) => b.id === parsed.button)?.label ?? parsed.button;
  const ges = W100_GESTURES.find((g) => g.id === parsed.gesture)?.label ?? parsed.gesture;
  return `${btn} · ${ges}`;
}

export function isW100ClimateSensor(
  model?: string | null,
  manufacturer?: string | null,
  description?: string | null,
): boolean {
  const m = (model ?? "").toUpperCase().replace(/\s/g, "");
  if (W100_MODELS.has(m)) return true;
  const desc = (description ?? "").toUpperCase();
  if (desc.includes("W100") || desc.includes("CLIMATE SENSOR W100")) return true;
  const mf = (manufacturer ?? "").toLowerCase();
  return mf.includes("aqara") && desc.includes("CLIMATE");
}

export function w100GestureToPress(gesture: W100Gesture): "short" | "long" | "double" {
  if (gesture === "hold") return "long";
  if (gesture === "double") return "double";
  return "short";
}
