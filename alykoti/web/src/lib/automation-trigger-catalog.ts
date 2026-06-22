import { hasCapability } from "@/lib/capabilities";
import { inferProtocolFromId } from "@/lib/device-protocol";
import type { DeviceCapability } from "@/lib/types";
import type { AutomationPressType } from "@/lib/automation";
import {
  DOUBLE_PRESS_ACTIONS,
  LONG_PRESS_ACTIONS,
  SHORT_PRESS_ACTIONS,
  actionsForPress,
} from "@/lib/automation";
import { mqttActionLabel, KNOWN_MQTT_ACTIONS } from "@/lib/automation-actions";
import {
  HUE_4BTN_MQTT_ACTIONS,
  hueMqttActionLabel,
  parseHueMqttAction,
  triggerProfileForDevice,
  type AutomationTriggerProfile,
} from "@/lib/automation-trigger-profiles";

export type TriggerActionOption = {
  id: string;
  label: string;
  group: string;
};

export type TriggerDeviceLike = {
  id: string;
  protocol?: string | null;
  kind?: string | null;
  capabilities?: DeviceCapability[];
  model?: string | null;
  manufacturer?: string | null;
  description?: string | null;
};

const ZWAVE_SWITCH_ENDPOINTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const ZWAVE_SENSOR_ACTIONS: TriggerActionOption[] = [
  { id: "value_true", label: "Arvo päällä / true", group: "Z-Wave anturi" },
  { id: "value_false", label: "Arvo pois / false", group: "Z-Wave anturi" },
  { id: "open", label: "Avoin (contact)", group: "Z-Wave anturi" },
  { id: "closed", label: "Kiinni (contact)", group: "Z-Wave anturi" },
  { id: "motion", label: "Liike havaittu", group: "Z-Wave anturi" },
  { id: "no_motion", label: "Ei liikettä", group: "Z-Wave anturi" },
  { id: "water_leak", label: "Vesivuoto", group: "Z-Wave anturi" },
  { id: "smoke", label: "Savu/palo", group: "Z-Wave anturi" },
];

const ZIGBEE_GESTURE_SUFFIXES = [
  "click",
  "press",
  "hold",
  "release",
  "double",
  "double_click",
  "hold_release",
  "press_release",
] as const;

const ZIGBEE_BUTTON_PREFIXES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "left",
  "right",
  "up",
  "down",
  "on",
  "off",
] as const;

function zwaveSwitchActions(): TriggerActionOption[] {
  const out: TriggerActionOption[] = [
    { id: "on", label: "ON (mikä tahansa kanava)", group: "Z-Wave kytkin" },
    { id: "off", label: "POIS (mikä tahansa kanava)", group: "Z-Wave kytkin" },
  ];
  for (const ep of ZWAVE_SWITCH_ENDPOINTS) {
    out.push({ id: `ep${ep}_on`, label: `Kanava ${ep} ON`, group: "Z-Wave kytkin" });
    out.push({ id: `ep${ep}_off`, label: `Kanava ${ep} POIS`, group: "Z-Wave kytkin" });
  }
  return out;
}

function zigbeeButtonActionIds(): string[] {
  const out = new Set<string>(KNOWN_MQTT_ACTIONS);
  for (const btn of ZIGBEE_BUTTON_PREFIXES) {
    for (const gesture of ZIGBEE_GESTURE_SUFFIXES) {
      out.add(`${btn}_${gesture}`);
    }
  }
  return [...out].sort((a, b) => a.localeCompare(b, "fi"));
}

function dedupeOptions(options: TriggerActionOption[]): TriggerActionOption[] {
  const seen = new Set<string>();
  const out: TriggerActionOption[] = [];
  for (const opt of options) {
    if (seen.has(opt.id)) continue;
    seen.add(opt.id);
    out.push(opt);
  }
  return out;
}

export function triggerPressForAction(action: string): AutomationPressType {
  const normalized = action.trim().replace(/-/g, "_");
  const hue = parseHueMqttAction(normalized);
  if (hue) {
    if (hue.gesture === "hold") return "long";
    if (hue.gesture === "press_release" || hue.gesture === "hold_release") return "short";
    return "short";
  }
  const a = normalized.toLowerCase();
  if (SHORT_PRESS_ACTIONS.has(a)) return "short";
  if (LONG_PRESS_ACTIONS.has(a)) return "long";
  if (DOUBLE_PRESS_ACTIONS.has(a)) return "double";
  for (const press of ["short", "long", "double"] as AutomationPressType[]) {
    for (const alias of actionsForPress(press)) {
      if (a === alias || a.endsWith(`_${alias}`) || a.startsWith(`${alias}_`)) {
        return press;
      }
    }
  }
  return "short";
}

export function triggerButtonForAction(action: string): string | null {
  const hue = parseHueMqttAction(action);
  if (hue) return null;
  const m = /^(\d+|left|right|up|down|on|off)_/i.exec(action.trim());
  return m ? m[1].toLowerCase() : null;
}

export function labelTriggerAction(action: string): string {
  const hue = parseHueMqttAction(action);
  if (hue) return hueMqttActionLabel(action);
  if (/^ep\d+_(on|off)$/i.test(action)) {
    const m = /^ep(\d+)_(on|off)$/i.exec(action);
    if (m) return `Kanava ${m[1]} ${m[2] === "on" ? "ON" : "POIS"}`;
  }
  return mqttActionLabel(action);
}

export function listTriggerActionsForDevice(
  device: TriggerDeviceLike | undefined,
  observedActions: string[] = [],
): TriggerActionOption[] {
  if (!device) {
    return dedupeOptions(
      zigbeeButtonActionIds().map((id) => ({
        id,
        label: labelTriggerAction(id),
        group: "Zigbee",
      })),
    );
  }

  const protocol = inferProtocolFromId(device.id, device.protocol as "zigbee" | "zwave" | undefined);
  const profile: AutomationTriggerProfile = triggerProfileForDevice(device);
  const caps = device.capabilities;

  let base: TriggerActionOption[] = [];

  if (profile === "hue_4btn") {
    base = HUE_4BTN_MQTT_ACTIONS.map((id) => ({
      id,
      label: hueMqttActionLabel(id),
      group: "Philips Hue",
    }));
  } else if (protocol === "zwave") {
    const isSensor =
      device.kind === "sensor" ||
      hasCapability(caps, "contact") ||
      hasCapability(caps, "motion") ||
      hasCapability(caps, "occupancy");
    const isSwitch =
      device.kind === "switch" || hasCapability(caps, "switch") || hasCapability(caps, "relay");

    if (isSwitch) base.push(...zwaveSwitchActions());
    if (isSensor) base.push(...ZWAVE_SENSOR_ACTIONS);
    if (base.length === 0) {
      base = [...zwaveSwitchActions(), ...ZWAVE_SENSOR_ACTIONS];
    }
  } else {
    base = zigbeeButtonActionIds().map((id) => ({
      id,
      label: labelTriggerAction(id),
      group: "Zigbee",
    }));
  }

  const seen = new Set(base.map((b) => b.id));
  for (const id of observedActions) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    base.push({
      id: trimmed,
      label: `${labelTriggerAction(trimmed)} (nähty laitteella)`,
      group: "Nähty live-tapahtumista",
    });
  }

  return dedupeOptions(base);
}

export function groupTriggerActionOptions(
  options: TriggerActionOption[],
): { group: string; items: TriggerActionOption[] }[] {
  const map = new Map<string, TriggerActionOption[]>();
  for (const opt of options) {
    const list = map.get(opt.group) ?? [];
    list.push(opt);
    map.set(opt.group, list);
  }
  return [...map.entries()].map(([group, items]) => ({ group, items }));
}
