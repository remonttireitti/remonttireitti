import type { HubHomeDevice } from "@/lib/types";

export type DeviceProtocol = HubHomeDevice["protocol"];

const PROTOCOL_ORDER: DeviceProtocol[] = [
  "zigbee",
  "zwave",
  "shelly",
  "tasmota",
  "airthings",
];

const PROTOCOL_LABELS: Record<DeviceProtocol, string> = {
  zigbee: "Zigbee",
  zwave: "Z-Wave",
  shelly: "Shelly",
  tasmota: "Tasmota",
  airthings: "Airthings",
};

export function inferProtocolFromId(id: string, fallback?: string): DeviceProtocol {
  if (id.startsWith("zigbee:")) return "zigbee";
  if (id.startsWith("zwave:")) return "zwave";
  if (id.startsWith("shelly:")) return "shelly";
  if (id.startsWith("tasmota:")) return "tasmota";
  if (id.startsWith("airthings:")) return "airthings";
  if (
    fallback === "zigbee" ||
    fallback === "zwave" ||
    fallback === "shelly" ||
    fallback === "tasmota" ||
    fallback === "airthings"
  ) {
    return fallback;
  }
  return "zigbee";
}

export function protocolLabel(protocol: string): string {
  return PROTOCOL_LABELS[protocol as DeviceProtocol] ?? protocol;
}

export function groupIdsByProtocol<T extends { id: string; protocol: string; name: string }>(
  items: T[],
): Array<{ protocol: DeviceProtocol; label: string; items: T[] }> {
  const map = new Map<DeviceProtocol, T[]>();
  for (const item of items) {
    const p = inferProtocolFromId(item.id, item.protocol);
    const list = map.get(p) ?? [];
    list.push({ ...item, protocol: p });
    map.set(p, list);
  }

  return PROTOCOL_ORDER.filter((p) => map.has(p)).map((protocol) => ({
    protocol,
    label: PROTOCOL_LABELS[protocol],
    items: (map.get(protocol) ?? []).sort((a, b) => a.name.localeCompare(b.name, "fi")),
  }));
}

export function filterByProtocol<T extends { id: string; protocol: string }>(
  items: T[],
  protocol: DeviceProtocol,
): T[] {
  return items.filter((d) => inferProtocolFromId(d.id, d.protocol) === protocol);
}

export function countByProtocol<T extends { id: string; protocol: string }>(
  items: T[],
): Record<DeviceProtocol, number> {
  const counts: Record<DeviceProtocol, number> = {
    zigbee: 0,
    zwave: 0,
    shelly: 0,
    tasmota: 0,
    airthings: 0,
  };
  for (const item of items) {
    const p = inferProtocolFromId(item.id, item.protocol);
    counts[p] += 1;
  }
  return counts;
}
