/** Pohjakuvan pisteet prosentteina (vasen/ylin kulma). Sama koordinaatisto webissä ja ESP32:lla. */

export const FLOOR_PLAN_IMAGE = "/images/pohjakuva.png";

export type FloorPlanOverlayKind =
  | "temperature"
  | "light"
  | "sensor"
  | "ventilation"
  | "climate";

export type FloorPlanAnchor = {
  id: string;
  label: string;
  /** 0–100 % pohjakuvan leveydestä */
  left: number;
  /** 0–100 % pohjakuvan korkeudesta */
  top: number;
  kind: FloorPlanOverlayKind;
};

/** Kiinteät huone-/pisteen paikat — täytetään jatkossa valoilla ja antureilla. */
export const FLOOR_PLAN_ANCHORS: FloorPlanAnchor[] = [
  { id: "garage", label: "Autotalli", left: 14, top: 16, kind: "light" },
  { id: "kitchen", label: "Keittiö", left: 30, top: 52, kind: "temperature" },
  { id: "living", label: "Olohuone", left: 48, top: 58, kind: "sensor" },
  { id: "utility", label: "Kodinhoito", left: 48, top: 22, kind: "ventilation" },
  { id: "bed1", label: "Makuuhuone 1", left: 14, top: 72, kind: "temperature" },
  { id: "bed2", label: "Makuuhuone 2", left: 78, top: 24, kind: "temperature" },
  { id: "bed3", label: "Makuuhuone 3", left: 78, top: 48, kind: "light" },
  { id: "bed4", label: "Makuuhuone 4", left: 78, top: 72, kind: "light" },
  { id: "entrance", label: "Eteinen", left: 38, top: 28, kind: "light" },
];

export type FloorPlanMarker = FloorPlanAnchor & {
  value?: string | null;
  active?: boolean;
  sub?: string | null;
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
