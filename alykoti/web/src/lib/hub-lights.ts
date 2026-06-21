import { anchorForLight } from "@/lib/lights-config";
import type { HubDeviceOverride, HubHomeDevice, HubLightState, HubState } from "@/lib/types";

export type HubLightDevice = {
  id: string;
  name: string;
  on: boolean;
  brightness: number | null;
  reachable: boolean;
  roomAnchorId: string | null;
  protocol: "zigbee" | "zwave" | "shelly" | "tasmota";
  kind: HubHomeDevice["kind"];
  room: string | null;
  controllable: boolean;
  mqttSetTopic: string | null;
};

const KIND_LABEL: Record<HubHomeDevice["kind"], string> = {
  light: "Valo",
  switch: "Kytkin",
  lock: "Lukko",
  fan: "Tuuletin",
  sensor: "Anturi",
  other: "Laite",
};

export function kindLabel(kind: HubHomeDevice["kind"]): string {
  return KIND_LABEL[kind] ?? "Laite";
}

export function parseHubHomeDevices(
  raw: HubState["home_devices"] | undefined,
  legacyLights?: HubState["lights"],
  overrides?: HubState["device_overrides"],
): HubLightDevice[] {
  let devices: HubLightDevice[] = [];

  if (raw && typeof raw === "object") {
    devices = Object.entries(raw).map(([id, device]) => {
      const d = device as HubHomeDevice;
      const o = overrides?.[id];
      if (o?.hidden) {
        return null;
      }
      const zigbeeName = id.startsWith("zigbee:") ? id.slice("zigbee:".length) : id;
      return {
        id,
        name: o?.display_name?.trim() || d.name?.trim() || id,
        on: d.on === true,
        brightness:
          typeof d.brightness === "number" && Number.isFinite(d.brightness)
            ? d.brightness
            : null,
        reachable: true,
        roomAnchorId: o?.floor_anchor ?? anchorForLight(zigbeeName) ?? null,
        protocol:
          d.protocol === "zwave"
            ? "zwave"
            : d.protocol === "shelly"
              ? "shelly"
              : d.protocol === "tasmota"
                ? "tasmota"
                : "zigbee",
        kind: d.kind ?? "other",
        room: o?.room ?? d.room ?? null,
        controllable: d.controllable === true,
        mqttSetTopic: d.mqtt_set_topic ?? null,
      };
    }).filter((d): d is HubLightDevice => d != null);
  } else {
    devices = parseHubLights(legacyLights).map((light) => ({
      ...light,
      protocol: "zigbee" as const,
      kind: "light" as const,
      room: null,
      controllable: true,
      mqttSetTopic: null,
    }));
  }

  return devices;
}

export function parseHubLights(
  raw: HubState["lights"] | undefined,
): Omit<HubLightDevice, "protocol" | "kind" | "room" | "controllable" | "mqttSetTopic">[] {
  if (!raw || typeof raw !== "object") return [];

  return Object.entries(raw).map(([id, state]) => {
    const light = state as HubLightState;
    const zigbeeName = id.startsWith("zigbee:") ? id.slice("zigbee:".length) : id;
    return {
      id,
      name: light.name?.trim() || id.replace(/^zigbee:/, ""),
      on: light.on === true,
      brightness:
        typeof light.brightness === "number" && Number.isFinite(light.brightness)
          ? light.brightness
          : null,
      reachable: true,
      roomAnchorId: anchorForLight(zigbeeName) ?? null,
    };
  });
}

export function groupDevices(devices: HubLightDevice[]) {
  return {
    lights: devices.filter((d) => d.kind === "light"),
    switches: devices.filter((d) => d.kind === "switch"),
    other: devices.filter((d) => !["light", "switch"].includes(d.kind)),
  };
}
