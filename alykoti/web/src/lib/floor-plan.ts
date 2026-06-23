/** Pohjakuvan pisteet prosentteina (vasen/ylin kulma). Sama koordinaatisto webissä ja ESP32:lla. */

import {
  HOUSE_ROOMS,
  deviceMapSub,
  deviceMapValue,
  offsetForRoomSlot,
  roomById,
  type DeviceMapInput,
} from "@/lib/rooms";
import type { FloorPlanPinIcon } from "@/lib/floor-plan-pins";

export const FLOOR_PLAN_IMAGE = "/images/pohjakuva.png";

export type FloorPlanOverlayKind =
  | "temperature"
  | "light"
  | "sensor"
  | "ventilation"
  | "climate"
  | "device";

export type FloorPlanAnchor = {
  id: string;
  label: string;
  /** 0–100 % pohjakuvan leveydestä */
  left: number;
  /** 0–100 % pohjakuvan korkeudesta */
  top: number;
  kind: FloorPlanOverlayKind;
};

/** Kaikki huoneet pohjakuvalla. */
export const FLOOR_PLAN_ANCHORS: FloorPlanAnchor[] = HOUSE_ROOMS.map((room) => ({
  id: room.id,
  label: room.label,
  left: room.left,
  top: room.top,
  kind: "device" as const,
}));

export type FloorPlanMarker = FloorPlanAnchor & {
  value?: string | null;
  active?: boolean;
  sub?: string | null;
  deviceId?: string;
  pinMode?: "bulb" | "label" | "icon";
  icon?: FloorPlanPinIcon;
  controllable?: boolean;
};

export function anchorToStyle(anchor: Pick<FloorPlanAnchor, "left" | "top">): {
  left: string;
  top: string;
} {
  return {
    left: `${anchor.left}%`,
    top: `${anchor.top}%`,
  };
}

export function buildDeviceMarkers(
  devices: DeviceMapInput[],
  options?: {
    effectiveOn?: (id: string) => boolean;
    kind?: FloorPlanOverlayKind;
    pinMode?: "bulb" | "label";
  },
): FloorPlanMarker[] {
  const kind = options?.kind ?? "light";
  const pinMode = options?.pinMode ?? "label";
  const withRoom = devices.filter((d) => d.roomAnchorId && roomById(d.roomAnchorId));
  const byRoom = new Map<string, DeviceMapInput[]>();

  for (const device of withRoom) {
    const roomId = device.roomAnchorId!;
    const list = byRoom.get(roomId) ?? [];
    list.push(device);
    byRoom.set(roomId, list);
  }

  const markers: FloorPlanMarker[] = [];

  for (const [roomId, roomDevices] of byRoom) {
    const room = roomById(roomId);
    if (!room) continue;

    roomDevices.forEach((device, index) => {
      const offset = offsetForRoomSlot(index, roomDevices.length);
      const on = options?.effectiveOn ? options.effectiveOn(device.id) : device.on;
      markers.push({
        id: `${roomId}:${device.id}`,
        deviceId: device.id,
        label: device.name,
        left: room.left + offset.left,
        top: room.top + offset.top,
        kind,
        pinMode,
        controllable: device.controllable,
        active: on,
        ...(pinMode === "bulb"
          ? { value: null, sub: null }
          : {
              value: deviceMapValue({ ...device, on }),
              sub: deviceMapSub({ ...device, on }),
            }),
      });
    });
  }

  return markers;
}

/** Ilmanvaihdon kiinteät pisteet huoneiden kautta. */
export const VENTILATION_ROOM_IDS = {
  co2: "olohuone",
  fans: "suihku",
} as const;
