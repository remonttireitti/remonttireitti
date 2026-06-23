/** Huoneet pohjakuvalla — koordinaatit % (vasen/ylin kulma), puhdas pohjakuva.png. */

export type HouseRoom = {
  id: string;
  label: string;
  left: number;
  top: number;
  /** Vaihtoehtoiset nimet (pienet kirjaimet, ilman aksentteja ok). */
  aliases: string[];
};

export const HOUSE_ROOMS: HouseRoom[] = [
  { id: "autotalli", label: "Autotalli", left: 12, top: 20, aliases: ["garage", "autotalli"] },
  { id: "takkahuone", label: "Takkahuone", left: 26, top: 20, aliases: ["takkahuone", "takka"] },
  { id: "suihku", label: "Suihku", left: 40, top: 18, aliases: ["suihku", "pesuhuone", "kodinhoito"] },
  { id: "sauna", label: "Sauna", left: 40, top: 35, aliases: ["sauna"] },
  { id: "keltainen-wc", label: "Keltainen WC", left: 26, top: 42, aliases: ["keltainen wc", "keltainen"] },
  { id: "keittio", label: "Keittiö", left: 30, top: 55, aliases: ["keittio", "keittiö", "kitchen"] },
  { id: "olohuone", label: "Olohuone", left: 48, top: 68, aliases: ["olohuone", "living"] },
  { id: "eteinen", label: "Eteinen", left: 58, top: 45, aliases: ["eteinen", "entrance", "hall"] },
  { id: "nele-huone", label: "Nelen huone", left: 12, top: 75, aliases: ["nele huone", "nele", "nelen huone"] },
  { id: "makuuhuone", label: "Makuuhuone", left: 82, top: 20, aliases: ["mh", "mh makuuhuone", "makuuhuone", "master"] },
  { id: "wc", label: "WC", left: 82, top: 38, aliases: ["wc", "vessa"] },
  { id: "hemppa", label: "Hemppa", left: 82, top: 55, aliases: ["hm", "hemppa", "hempan huone"] },
  { id: "glen", label: "Glen", left: 82, top: 75, aliases: ["gk", "glen", "glenin huone"] },
  { id: "terassi", label: "Terassi", left: 55, top: 92, aliases: ["terassi", "terrace", "patio"] },
];

const ROOM_BY_ID = new Map(HOUSE_ROOMS.map((r) => [r.id, r]));

export function roomById(id: string): HouseRoom | undefined {
  return ROOM_BY_ID.get(id);
}

export function normalizeRoomKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/** Etsi huone id tekstistä (override.room, laitteen nimi, floor_anchor). */
export function resolveRoomAnchorId(
  roomText: string | null | undefined,
  floorAnchor?: string | null,
  deviceName?: string | null,
): string | null {
  if (floorAnchor && ROOM_BY_ID.has(floorAnchor)) return floorAnchor;

  const candidates = [roomText, deviceName].filter(Boolean) as string[];
  for (const raw of candidates) {
    const key = normalizeRoomKey(raw);
    if (!key) continue;

    for (const room of HOUSE_ROOMS) {
      if (normalizeRoomKey(room.id) === key || normalizeRoomKey(room.label) === key) {
        return room.id;
      }
      for (const alias of room.aliases) {
        const aliasKey = normalizeRoomKey(alias);
        if (key === aliasKey || key.includes(aliasKey) || aliasKey.includes(key)) {
          return room.id;
        }
      }
    }
  }

  return null;
}

export function roomLabelForId(id: string | null | undefined): string | null {
  if (!id) return null;
  return ROOM_BY_ID.get(id)?.label ?? null;
}

export type DeviceMapInput = {
  id: string;
  name: string;
  roomAnchorId: string | null;
  on: boolean;
  brightness?: number | null;
  readingLabel?: string | null;
  controllable?: boolean;
};

/** Sijoita laitteet huoneen koordinaatteihin; useampi laite samassa huoneessa hieman eri paikkaan. */
export function offsetForRoomSlot(index: number, total: number): { left: number; top: number } {
  if (total <= 1) return { left: 0, top: 0 };
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const radius = Math.min(2.8, 1.2 + total * 0.3);
  return {
    left: Math.cos(angle) * radius,
    top: Math.sin(angle) * radius,
  };
}

export function deviceMapValue(device: DeviceMapInput): string {
  if (device.readingLabel) return device.readingLabel;
  if (device.controllable === false) return device.on ? "Aktiivinen" : "—";
  return device.on ? "Päällä" : "Pois";
}

export function deviceMapSub(device: DeviceMapInput): string | null {
  if (device.brightness != null && device.on) {
    return `${Math.round((device.brightness / 254) * 100)} %`;
  }
  return null;
}
