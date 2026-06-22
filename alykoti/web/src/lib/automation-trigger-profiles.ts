/** Philips Hue 4-painike (on/off/ylös/alas) — Zigbee2MQTT action-muoto. */

export const HUE_4BTN_BUTTONS = [
  { id: "on", label: "On" },
  { id: "off", label: "Off" },
  { id: "up", label: "Ylös" },
  { id: "down", label: "Alas" },
] as const;

/** Automaatiolomakkeessa näytettävät toiminnot (Zigbee2MQTT: press / hold / hold_release). */
export const HUE_4BTN_GESTURES_UI = [
  { id: "press", label: "Painallus" },
  { id: "hold", label: "Pito" },
  { id: "hold_release", label: "Pito päättyi" },
] as const;

export const HUE_4BTN_GESTURES = [
  ...HUE_4BTN_GESTURES_UI,
  { id: "press_release", label: "Painallus päättyi" },
] as const;

export type Hue4BtnButton = (typeof HUE_4BTN_BUTTONS)[number]["id"];
export type Hue4BtnGestureUi = (typeof HUE_4BTN_GESTURES_UI)[number]["id"];
export type Hue4BtnGesture = (typeof HUE_4BTN_GESTURES)[number]["id"];

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

export type AutomationTriggerProfile = "hue_4btn" | "generic";

export function triggerProfileForDevice(device: {
  model?: string | null;
  manufacturer?: string | null;
  description?: string | null;
}): AutomationTriggerProfile {
  return isHue4ButtonRemote(device.model, device.manufacturer, device.description)
    ? "hue_4btn"
    : "generic";
}

/** Yellow-yhteensopiva press-kenttä kun action on täysi Hue-merkkijono. */
export function hueGestureToPress(gesture: Hue4BtnGesture | Hue4BtnGestureUi): "short" | "long" {
  return gesture === "hold" || gesture === "hold_release" ? "long" : "short";
}

export function hueTriggerFields(
  button: Hue4BtnButton,
  gesture: Hue4BtnGestureUi,
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
