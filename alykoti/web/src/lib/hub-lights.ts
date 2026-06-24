import {
  formatCapabilitiesSummary,
  inferControllable,
  inferKindFromCapabilities,
  normalizeCapabilities,
  sensorReadingLabel,
} from "@/lib/capabilities";
import { inferDeviceRole, groupDevicesByRole } from "@/lib/device-roles";
import type { DeviceRole } from "@/lib/device-roles";
import { inferProtocolFromId, parseZwaveDeviceId } from "@/lib/device-protocol";
import {
  parseWifiChannelDeviceId,
  parseWifiEmDeviceId,
  resolveWifiChannelDisplayName,
  zwaveEndpointItemKey,
} from "@/lib/device-item-overrides";
import { anchorForLight } from "@/lib/lights-config";
import { resolveRoomAnchorId, roomLabelForId } from "@/lib/rooms";
import { groupZwaveDevicesForList, zwaveNodeId } from "@/lib/zwave-detail";
import type { DeviceCapability, HubDeviceOverride, HubHomeDevice, HubLightState, HubState, ZwaveProperty } from "@/lib/types";

export type HubLightDevice = {
  id: string;
  name: string;
  on: boolean;
  brightness: number | null;
  reachable: boolean;
  roomAnchorId: string | null;
  protocol: HubHomeDevice["protocol"];
  kind: HubHomeDevice["kind"];
  room: string | null;
  controllable: boolean;
  mqttSetTopic: string | null;
  lockSetTopic: string | null;
  locked: boolean | null;
  capabilities: DeviceCapability[];
  capabilitiesLabel: string;
  readingLabel: string | null;
  temperature_c: number | null;
  humidity_pct: number | null;
  co2_ppm: number | null;
  illuminance_lux: number | null;
  sensor_state: string | null;
  endpoint: number | null;
  node_id: number | null;
  power_w: number | null;
  battery_pct?: number | null;
  voltage_v?: number | null;
  model?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  role: DeviceRole;
  inferredRole: DeviceRole;
  roleOverride: DeviceRole | null;
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

function resolveDeviceDisplayName(
  id: string,
  d: HubHomeDevice,
  o: HubDeviceOverride | undefined,
  allOverrides?: HubState["device_overrides"],
): string {
  if (o?.display_name?.trim()) return o.display_name.trim();

  const zwave = parseZwaveDeviceId(id);
  if (zwave?.endpoint != null && allOverrides) {
    const parent = allOverrides[zwaveNodeId(zwave.nodeId)];
    const epName = parent?.item_names?.[zwaveEndpointItemKey(zwave.endpoint)]?.trim();
    if (epName) return epName;
  }

  if (parseWifiChannelDeviceId(id) || parseWifiEmDeviceId(id)) {
    return resolveWifiChannelDisplayName(id, d.name?.trim() || id, allOverrides);
  }

  return d.name?.trim() || id;
}

function mapDevice(
  id: string,
  d: HubHomeDevice,
  o: HubDeviceOverride | undefined,
  allOverrides?: HubState["device_overrides"],
  includeHidden = false,
): HubLightDevice | null {
  if (o?.hidden && !includeHidden) return null;

  const capabilities = normalizeCapabilities(d.capabilities);
  const kind = d.kind ?? (capabilities.length ? inferKindFromCapabilities(capabilities) : "other");
  const controllable =
    d.controllable === true || (d.controllable !== false && inferControllable(capabilities));
  const zigbeeName = id.startsWith("zigbee:") ? id.slice("zigbee:".length) : id;
  const zwaveParsed = parseZwaveDeviceId(id);

  const displayName = resolveDeviceDisplayName(id, d, o, allOverrides);
  const inferredRoomAnchorId =
    resolveRoomAnchorId(o?.room ?? d.room ?? null, o?.floor_anchor, displayName) ??
    anchorForLight(zigbeeName) ??
    null;
  const explicitRoom = o?.room ?? d.room ?? null;
  const inferredRoomLabel = roomLabelForId(inferredRoomAnchorId);

  const mapped: HubLightDevice = {
    id,
    name: displayName,
    on: d.on === true,
    brightness:
      typeof d.brightness === "number" && Number.isFinite(d.brightness) ? d.brightness : null,
    reachable: true,
    roomAnchorId: o?.floor_anchor ?? inferredRoomAnchorId,
    protocol: inferProtocolFromId(id, d.protocol),
    kind,
    room: explicitRoom ?? inferredRoomLabel,
    controllable,
    mqttSetTopic: d.mqtt_set_topic ?? null,
    lockSetTopic: d.lock_set_topic ?? null,
    locked: d.locked ?? null,
    capabilities,
    capabilitiesLabel: formatCapabilitiesSummary(capabilities),
    readingLabel: sensorReadingLabel(
      d,
      o?.item_names ?? (zwaveParsed ? allOverrides?.[zwaveNodeId(zwaveParsed.nodeId)]?.item_names : undefined),
      zwaveParsed?.nodeId,
      allOverrides,
    ),
    temperature_c:
      typeof d.temperature_c === "number" && Number.isFinite(d.temperature_c) ? d.temperature_c : null,
    humidity_pct:
      typeof d.humidity_pct === "number" && Number.isFinite(d.humidity_pct) ? d.humidity_pct : null,
    co2_ppm: typeof d.co2_ppm === "number" && Number.isFinite(d.co2_ppm) ? d.co2_ppm : null,
    illuminance_lux:
      typeof d.illuminance_lux === "number" && Number.isFinite(d.illuminance_lux)
        ? d.illuminance_lux
        : null,
    sensor_state: typeof d.sensor_state === "string" ? d.sensor_state : null,
    endpoint:
      typeof d.endpoint === "number" && Number.isFinite(d.endpoint)
        ? d.endpoint
        : zwaveParsed?.endpoint ?? null,
    node_id:
      typeof d.node_id === "number" && Number.isFinite(d.node_id)
        ? d.node_id
        : zwaveParsed?.nodeId ?? null,
    power_w: typeof d.power_w === "number" && Number.isFinite(d.power_w) ? d.power_w : null,
    model: d.model ?? null,
    manufacturer: d.manufacturer ?? null,
    description: d.description ?? null,
    battery_pct:
      typeof d.battery_pct === "number" && Number.isFinite(d.battery_pct) ? d.battery_pct : null,
    voltage_v: typeof d.voltage_v === "number" && Number.isFinite(d.voltage_v) ? d.voltage_v : null,
    role: "other_control" as DeviceRole,
    inferredRole: "other_control" as DeviceRole,
    roleOverride: o?.role ?? null,
  };

  mapped.inferredRole = inferDeviceRole(mapped);
  mapped.role = o?.role ?? mapped.inferredRole;
  return mapped;
}

function zwavePropertiesForDevice(
  device: HubLightDevice,
  rawDevice: HubHomeDevice | undefined,
  node: NonNullable<HubState["zwave_nodes"]>[string],
): ZwaveProperty[] {
  if (rawDevice?.zwave_properties?.length) return rawDevice.zwave_properties;
  const endpoint = device.endpoint ?? 0;
  const onEndpoint = node.properties.filter((p) => p.endpoint === endpoint);
  if (onEndpoint.length > 0) return onEndpoint;
  if ((node.endpoints?.length ?? 0) <= 1) return node.properties;
  return onEndpoint;
}

function enrichZwaveReading(
  device: HubLightDevice,
  raw: HubState["home_devices"] | undefined,
  zwaveNodes: HubState["zwave_nodes"] | undefined,
  overrides?: HubState["device_overrides"],
): HubLightDevice {
  if (device.protocol !== "zwave" || device.node_id == null || !zwaveNodes) return device;
  const node = zwaveNodes[String(device.node_id)];
  if (!node?.properties?.length) return device;

  const rawDevice = raw?.[device.id] as HubHomeDevice | undefined;
  const properties = zwavePropertiesForDevice(device, rawDevice, node);
  if (!properties.length) return device;

  const nodeOverride = overrides?.[zwaveNodeId(device.node_id)];
  const readingLabel = sensorReadingLabel(
    {
      ...(rawDevice ?? { protocol: "zwave", kind: device.kind, name: device.name }),
      capabilities: device.capabilities,
      zwave_properties: properties,
    },
    nodeOverride?.item_names ?? overrides?.[device.id]?.item_names,
    device.node_id,
    overrides,
  );
  return readingLabel ? { ...device, readingLabel } : device;
}

/** Group multi-endpoint Z-Wave nodes and enrich readings from hub MQTT state. */
export function prepareDevicesForList(
  devices: HubLightDevice[],
  raw?: HubState["home_devices"],
  zwaveNodes?: HubState["zwave_nodes"],
  overrides?: HubState["device_overrides"],
): HubLightDevice[] {
  const enriched = devices.map((device) => enrichZwaveReading(device, raw, zwaveNodes, overrides));
  return groupZwaveDevicesForList(enriched);
}

export function parseHubHomeDevices(
  raw: HubState["home_devices"] | undefined,
  legacyLights?: HubState["lights"],
  overrides?: HubState["device_overrides"],
  options?: { includeHidden?: boolean },
): HubLightDevice[] {
  if (raw && typeof raw === "object") {
    return Object.entries(raw)
      .map(([id, device]) =>
        mapDevice(id, device as HubHomeDevice, overrides?.[id], overrides, options?.includeHidden),
      )
      .filter((d): d is HubLightDevice => d != null);
  }

  return parseHubLights(legacyLights).map((light) => ({
    ...light,
    protocol: "zigbee" as const,
    kind: "light" as const,
    room: null,
    controllable: true,
    mqttSetTopic: null,
    lockSetTopic: null,
    locked: null,
    capabilities: [{ id: "switch", read: true, write: true }],
    capabilitiesLabel: "Kytkin",
    readingLabel: null,
    temperature_c: null,
    humidity_pct: null,
    co2_ppm: null,
    illuminance_lux: null,
    sensor_state: null,
    endpoint: null,
    node_id: null,
    power_w: null,
    role: "light" as const,
    inferredRole: "light" as const,
    roleOverride: null,
  }));
}

/** Kaikki home_devices-rivit yhdelle Z-Wave-solmulle (myös piilotetut). */
export function hubLightDevicesForZwaveNode(
  hubState: HubState | undefined,
  nodeId: number,
): HubLightDevice[] {
  const raw = hubState?.home_devices;
  if (!raw || typeof raw !== "object") return [];
  const overrides = hubState?.device_overrides;
  const out: HubLightDevice[] = [];
  for (const [id, device] of Object.entries(raw)) {
    if (parseZwaveDeviceId(id)?.nodeId !== nodeId) continue;
    const mapped = mapDevice(id, device as HubHomeDevice, overrides?.[id], overrides, true);
    if (mapped) out.push(mapped);
  }
  return out;
}

export function parseHubLights(
  raw: HubState["lights"] | undefined,
): Omit<
  HubLightDevice,
  | "protocol"
  | "kind"
  | "room"
  | "controllable"
  | "mqttSetTopic"
  | "lockSetTopic"
  | "locked"
  | "capabilities"
  | "capabilitiesLabel"
  | "readingLabel"
  | "temperature_c"
  | "humidity_pct"
  | "co2_ppm"
  | "illuminance_lux"
  | "sensor_state"
  | "endpoint"
  | "node_id"
  | "power_w"
  | "role"
  | "inferredRole"
  | "roleOverride"
>[] {
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

export function groupDevices(
  devices: HubLightDevice[],
  overrides?: HubState["device_overrides"],
) {
  const byRole = groupDevicesByRole(devices, overrides);
  return {
    lights: byRole.lights,
    switches: byRole.lightSwitches,
    dimmers: byRole.dimmers,
    fans: byRole.fans,
    sensors: byRole.sensors,
    locks: byRole.locks,
    heating: byRole.heating,
    otherControl: byRole.otherControl,
    contact: byRole.contact,
    fireAlarms: byRole.fireAlarms,
    leakDetectors: byRole.leakDetectors,
    motion: byRole.motion,
    other: byRole.otherControl,
  };
}

export { formatCapabilitiesSummary, capabilityLabel } from "@/lib/capabilities";
