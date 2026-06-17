"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  anchorToStyle,
  FLOOR_PLAN_IMAGE,
  type FloorPlanMarker,
} from "@/lib/floor-plan";

type Props = {
  title?: string;
  markers?: FloorPlanMarker[];
  headerRight?: ReactNode;
  footer?: ReactNode;
  className?: string;
  onMarkerClick?: (id: string) => void;
};

export function FloorPlanView({
  title = "Koti",
  markers = [],
  headerRight,
  footer,
  className = "",
  onMarkerClick,
}: Props) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        {headerRight}
      </div>

      <div className="relative aspect-[4/3] w-full min-h-[280px] bg-stone-200 sm:min-h-[420px]">
        <Image
          src={FLOOR_PLAN_IMAGE}
          alt="Pohjapiirros"
          fill
          priority
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 1024px"
        />

        {markers.map((marker) => (
          <FloorPlanMarkerPin
            key={marker.id}
            marker={marker}
            onClick={onMarkerClick ? () => onMarkerClick(marker.id) : undefined}
          />
        ))}
      </div>

      {footer}
    </section>
  );
}

function FloorPlanMarkerPin({
  marker,
  onClick,
}: {
  marker: FloorPlanMarker;
  onClick?: () => void;
}) {
  const pos = anchorToStyle(marker);
  const tone = markerTone(marker);
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={marker.label}
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2 py-1 text-center shadow-md backdrop-blur transition ${tone} ${
        onClick ? "hover:ring-2 hover:ring-offset-1" : ""
      } ${marker.active ? "ring-2 ring-amber-400" : ""}`}
      style={pos}
    >
      <p className="max-w-[88px] truncate text-[9px] font-semibold uppercase tracking-wide opacity-80 sm:text-[10px]">
        {marker.label}
      </p>
      {marker.value != null && (
        <p className="text-xs font-bold leading-tight sm:text-sm">{marker.value}</p>
      )}
      {marker.sub && (
        <p className="text-[8px] opacity-70 sm:text-[9px]">{marker.sub}</p>
      )}
      {marker.value == null && marker.kind === "light" && (
        <p className="text-[10px] text-stone-500">—</p>
      )}
    </Tag>
  );
}

function markerTone(marker: FloorPlanMarker): string {
  switch (marker.kind) {
    case "ventilation":
      return "border-emerald-300 bg-emerald-50/95 text-emerald-950 hover:ring-emerald-400";
    case "temperature":
      return "border-orange-300 bg-orange-50/95 text-orange-950 hover:ring-orange-400";
    case "light":
      return marker.active
        ? "border-amber-300 bg-amber-50/95 text-amber-950 hover:ring-amber-400"
        : "border-stone-300 bg-white/90 text-stone-700 hover:ring-stone-300";
    case "climate":
      return "border-sky-300 bg-sky-50/95 text-sky-950 hover:ring-sky-400";
    default:
      return "border-blue-300 bg-blue-50/95 text-blue-950 hover:ring-blue-400";
  }
}
