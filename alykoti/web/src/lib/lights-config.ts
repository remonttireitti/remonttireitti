import { FLOOR_PLAN_ANCHORS } from "@/lib/floor-plan";
import { resolveRoomAnchorId } from "@/lib/rooms";

/** Zigbee2MQTT friendly_name → pohjakartan anchor id (vanha kiinteä kartta). */
export const LIGHT_ROOM_MAP: Record<string, string> = {};

export const LIGHT_ANCHORS = FLOOR_PLAN_ANCHORS;

export function anchorForLight(friendlyName: string): string | undefined {
  return LIGHT_ROOM_MAP[friendlyName] ?? resolveRoomAnchorId(null, null, friendlyName) ?? undefined;
}
