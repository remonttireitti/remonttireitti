import { canWrite, hasCapability } from "@/lib/capabilities";
import type { DeviceCapability } from "@/lib/types";
import {
  ACTION_LABELS,
  type AutomationActionType,
  type AutomationPressType,
} from "@/lib/automation";

const ALL_ACTIONS = Object.keys(ACTION_LABELS) as AutomationActionType[];

/** Toiminnot jotka vaativat värin tuen. */
const COLOR_ACTIONS: AutomationActionType[] = ["color_next", "color_prev"];

/** Toiminnot jotka vaativat himmennyksen. */
const DIMMER_ACTIONS: AutomationActionType[] = [
  "brightness_up",
  "brightness_down",
  "set_brightness",
];

const LOCK_ACTIONS: AutomationActionType[] = ["lock", "unlock", "toggle_lock"];

const SWITCH_ACTIONS: AutomationActionType[] = ["on", "off", "toggle"];

export function actionsForTargetCapabilities(
  caps: DeviceCapability[] | undefined,
): AutomationActionType[] {
  const out = new Set<AutomationActionType>();

  if (canWrite(caps, "switch") || canWrite(caps, "relay")) {
    for (const a of SWITCH_ACTIONS) out.add(a);
  }
  if (canWrite(caps, "dimmer")) {
    for (const a of DIMMER_ACTIONS) out.add(a);
  }
  if (canWrite(caps, "color")) {
    for (const a of COLOR_ACTIONS) out.add(a);
  }
  if (canWrite(caps, "lock")) {
    for (const a of LOCK_ACTIONS) out.add(a);
  }
  if (canWrite(caps, "fan") || canWrite(caps, "cover")) {
    for (const a of SWITCH_ACTIONS) out.add(a);
  }

  if (out.size === 0) {
    return ["on", "off", "toggle"];
  }

  return ALL_ACTIONS.filter((a) => out.has(a));
}

export function actionsForTargetGroup(
  targets: Array<{ capabilities: DeviceCapability[] }>,
): AutomationActionType[] {
  if (targets.length === 0) return ALL_ACTIONS;
  const allowed = new Set<AutomationActionType>();
  for (const target of targets) {
    for (const action of actionsForTargetCapabilities(target.capabilities)) {
      allowed.add(action);
    }
  }
  return ALL_ACTIONS.filter((a) => allowed.has(a));
}

export function isButtonTrigger(caps: DeviceCapability[] | undefined): boolean {
  return hasCapability(caps, "button");
}

export function isSensorTrigger(caps: DeviceCapability[] | undefined): boolean {
  return (
    hasCapability(caps, "contact") ||
    hasCapability(caps, "motion") ||
    hasCapability(caps, "occupancy")
  );
}

/** Näytettävät painallustyypit laukaisimelle. */
export function pressTypesForTrigger(caps: DeviceCapability[] | undefined): AutomationPressType[] {
  if (isSensorTrigger(caps)) {
    return ["short"];
  }
  return ["short", "long", "double"];
}

/** Tunnetut MQTT-action-arvot (Zigbee2MQTT). */
export const KNOWN_MQTT_ACTIONS = [
  "single",
  "single_click",
  "click",
  "on",
  "off",
  "toggle",
  "hold",
  "long",
  "long_press",
  "double",
  "double_click",
  "1_click",
  "2_click",
  "3_click",
  "4_click",
  "1_hold",
  "2_hold",
  "1_double",
  "2_double",
  "left_click",
  "right_click",
  "left_hold",
  "right_hold",
  "left_double",
  "right_double",
  "brightness_up",
  "brightness_down",
  "open",
  "close",
  "stop",
] as const;

import { hueMqttActionLabel, parseHueMqttAction } from "@/lib/automation-trigger-profiles";

export function mqttActionLabel(action: string): string {
  const hue = parseHueMqttAction(action);
  if (hue) return hueMqttActionLabel(action);
  const a = action.toLowerCase();
  if (a === "single" || a === "single_click" || a === "click") return "Lyhyt painallus (single)";
  if (a === "hold" || a === "long" || a === "long_press") return "Pitkä painallus (hold)";
  if (a === "double" || a === "double_click") return "Tupla (double)";
  return action;
}
