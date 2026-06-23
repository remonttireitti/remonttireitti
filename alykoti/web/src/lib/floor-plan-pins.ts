import type { FloorPlanMarker } from "@/lib/floor-plan";
import { deviceMapSub, deviceMapValue } from "@/lib/rooms";

export type FloorPlanPinIcon =
  | "bulb"
  | "switch"
  | "plug"
  | "fan"
  | "lock"
  | "door"
  | "motion"
  | "fire"
  | "leak"
  | "thermometer"
  | "sensor"
  | "ventilation"
  | "label";

export type FloorPlanPinAction =
  | { type: "toggle"; deviceId: string }
  | { type: "navigate"; href: string }
  | { type: "open_link"; href: string }
  | { type: "none" };

export type FloorPlanPin = {
  id: string;
  label: string;
  left: number;
  top: number;
  icon: FloorPlanPinIcon;
  action: FloorPlanPinAction;
  /** Näytä laitteen tila/arvo (toggle-toiminnon laite tai erillinen). */
  deviceId?: string | null;
  showValue?: boolean;
  hidden?: boolean;
};

export const FLOOR_PLAN_PIN_ICONS: Array<{ id: FloorPlanPinIcon; label: string }> = [
  { id: "bulb", label: "Lamppu" },
  { id: "switch", label: "Kytkin" },
  { id: "plug", label: "Pistorasia" },
  { id: "fan", label: "Tuuletin" },
  { id: "lock", label: "Lukko" },
  { id: "door", label: "Ovi" },
  { id: "motion", label: "Liike" },
  { id: "fire", label: "Palohälytin" },
  { id: "leak", label: "Vuoto" },
  { id: "thermometer", label: "Lämpö" },
  { id: "sensor", label: "Anturi" },
  { id: "ventilation", label: "Ilmanvaihto" },
  { id: "label", label: "Teksti" },
];

export const FLOOR_PLAN_ACTION_TYPES: Array<{
  id: FloorPlanPinAction["type"];
  label: string;
}> = [
  { id: "toggle", label: "Ohjaa laitetta (päälle/pois)" },
  { id: "navigate", label: "Avaa sivu sovelluksessa" },
  { id: "open_link", label: "Avaa linkki" },
  { id: "none", label: "Ei toimintoa (vain näyttö)" },
];

export type FloorPlanDeviceSnapshot = {
  id: string;
  name: string;
  on: boolean;
  controllable: boolean;
  readingLabel?: string | null;
  temperature_c?: number | null;
  humidity_pct?: number | null;
  co2_ppm?: number | null;
  sensor_state?: string | null;
};

export function clampPinCoord(value: number): number {
  return Math.max(2, Math.min(98, Math.round(value * 10) / 10));
}

export function deviceIdForPin(pin: FloorPlanPin): string | null {
  if (pin.action.type === "toggle") return pin.action.deviceId;
  return pin.deviceId ?? null;
}

export function pinToMarker(
  pin: FloorPlanPin,
  devices: FloorPlanDeviceSnapshot[],
  effectiveOn?: (id: string) => boolean,
): FloorPlanMarker {
  const deviceId = deviceIdForPin(pin);
  const device = deviceId ? devices.find((d) => d.id === deviceId) : undefined;
  const on = device
    ? effectiveOn
      ? effectiveOn(device.id)
      : device.on
    : false;
  const useBulb = pin.icon === "bulb";
  const showValue = pin.showValue !== false && pin.icon !== "bulb";
  const pinMode: FloorPlanMarker["pinMode"] = useBulb
    ? "bulb"
    : pin.icon === "label" || showValue
      ? "label"
      : "icon";

  const mapInput = device
    ? {
        id: device.id,
        name: device.name,
        roomAnchorId: null,
        on,
        controllable: device.controllable,
        readingLabel: device.readingLabel ?? null,
      }
    : null;

  return {
    id: pin.id,
    deviceId: deviceId ?? undefined,
    label: pin.label.trim() || device?.name || "Piste",
    left: pin.left,
    top: pin.top,
    kind: pinKind(pin.icon),
    icon: pin.icon,
    pinMode,
    controllable: pin.action.type === "toggle" && (device?.controllable ?? false),
    active: on,
    value: showValue && mapInput ? deviceMapValue(mapInput) : null,
    sub: showValue && mapInput ? deviceMapSub(mapInput) : null,
  };
}

function pinKind(icon: FloorPlanPinIcon): FloorPlanMarker["kind"] {
  switch (icon) {
    case "ventilation":
      return "ventilation";
    case "thermometer":
      return "temperature";
    case "bulb":
      return "light";
    case "fan":
      return "climate";
    default:
      return "device";
  }
}

export function pinsToMarkers(
  pins: FloorPlanPin[],
  devices: FloorPlanDeviceSnapshot[],
  effectiveOn?: (id: string) => boolean,
): FloorPlanMarker[] {
  return pins
    .filter((p) => !p.hidden)
    .map((pin) => pinToMarker(pin, devices, effectiveOn));
}
