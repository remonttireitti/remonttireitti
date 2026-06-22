import { hasCapability } from "@/lib/capabilities";
import { inferProtocolFromId, parseZwaveDeviceId } from "@/lib/device-protocol";
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
  W100_MQTT_ACTIONS,
  w100MqttActionLabel,
  parseW100MqttAction,
  w100GestureToPress,
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
  endpoint?: number | null;
  capabilities?: DeviceCapability[];
  model?: string | null;
  manufacturer?: string | null;
  description?: string | null;
};

const ZWAVE_FALLBACK_SWITCH_ACTIONS: TriggerActionOption[] = [
  { id: "on", label: "ON", group: "Z-Wave kytkin" },
  { id: "off", label: "POIS", group: "Z-Wave kytkin" },
];

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

function zwaveSwitchActionsForDevice(device: TriggerDeviceLike): TriggerActionOption[] {
  const parsed = parseZwaveDeviceId(device.id);
  const endpoint = parsed?.endpoint ?? device.endpoint;

  const out: TriggerActionOption[] = [...ZWAVE_FALLBACK_SWITCH_ACTIONS];

  if (endpoint != null && parsed?.endpoint != null) {
    out.push(
      { id: `ep${endpoint}_on`, label: `Kanava ${endpoint} ON`, group: "Z-Wave kytkin" },
      { id: `ep${endpoint}_off`, label: `Kanava ${endpoint} POIS`, group: "Z-Wave kytkin" },
    );
  }

  return out;
}

function zwaveSensorOnly(device: TriggerDeviceLike, caps: DeviceCapability[] | undefined): boolean {
  const isSensor =
    device.kind === "sensor" ||
    hasCapability(caps, "contact") ||
    hasCapability(caps, "motion") ||
    hasCapability(caps, "occupancy");
  const isSwitch =
    device.kind === "switch" ||
    device.kind === "light" ||
    hasCapability(caps, "switch") ||
    hasCapability(caps, "relay") ||
    hasCapability(caps, "dimmer");
  return isSensor && !isSwitch;
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
  const w100 = parseW100MqttAction(normalized);
  if (w100) return w100GestureToPress(w100.gesture);
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
  const w100 = parseW100MqttAction(action);
  if (w100) return w100.button;
  const hue = parseHueMqttAction(action);
  if (hue) return null;
  const m = /^(\d+|left|right|up|down|on|off)_/i.exec(action.trim());
  return m ? m[1].toLowerCase() : null;
}

export function labelTriggerAction(action: string): string {
  const w100 = parseW100MqttAction(action);
  if (w100 || /^W100_PMTSD_request$/i.test(action.trim())) return w100MqttActionLabel(action);
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
  } else if (profile === "w100_3btn") {
    base = W100_MQTT_ACTIONS.map((id) => ({
      id,
      label: w100MqttActionLabel(id),
      group: "Aqara W100",
    }));
  } else if (protocol === "zwave") {
    const isSensor =
      device.kind === "sensor" ||
      hasCapability(caps, "contact") ||
      hasCapability(caps, "motion") ||
      hasCapability(caps, "occupancy");
    const isSwitch =
      device.kind === "switch" ||
      device.kind === "light" ||
      hasCapability(caps, "switch") ||
      hasCapability(caps, "relay") ||
      hasCapability(caps, "dimmer");

    if (zwaveSensorOnly(device, caps)) {
      base.push(...ZWAVE_SENSOR_ACTIONS);
    } else if (isSwitch) {
      base.push(...zwaveSwitchActionsForDevice(device));
    } else if (isSensor) {
      base.push(...ZWAVE_SENSOR_ACTIONS);
    } else {
      base = [...ZWAVE_FALLBACK_SWITCH_ACTIONS];
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
