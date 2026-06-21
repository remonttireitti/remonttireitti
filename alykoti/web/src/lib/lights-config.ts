import { FLOOR_PLAN_ANCHORS } from "@/lib/floor-plan";

/** Zigbee2MQTT friendly_name → pohjakartan anchor id */
export const LIGHT_ROOM_MAP: Record<string, string> = {
  // Esim: olohuone_kattovalo: "living",
};

export const LIGHT_ANCHORS = FLOOR_PLAN_ANCHORS.filter((a) => a.kind === "light");

export function anchorForLight(friendlyName: string): string | undefined {
  return LIGHT_ROOM_MAP[friendlyName];
}
