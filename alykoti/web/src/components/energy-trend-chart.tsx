"use client";

import { useMemo, useRef, useState } from "react";
import type { DailyEnergy, DailyTemp } from "@/lib/energy-samples";

type Props = {
  daily: DailyEnergy[];
  outdoor?: DailyTemp[];
  indoor?: DailyTemp[];
  showOutdoor: boolean;
  showIndoor: boolean;
  lastNDays: number;
  onToggleOutdoor?: () => void;
  onToggleIndoor?: () => void;
  hasOutdoor?: boolean;
  hasIndoor?: boolean;
};

const W = 560;
const H = 200;
const PAD = { top: 12, right: 28, bottom: 28, left: 36 };

export function EnergyTrendChart({
  daily,
  outdoor = [],
  indoor = [],
  showOutdoor,
  showIndoor,
  lastNDays,
  onToggleOutdoor,
  onToggleIndoor,
  hasOutdoor = false,
  hasIndoor = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const slice = useMemo(() => daily.slice(-lastNDays), [daily, lastNDays]);

  const outdoorByDate = useMemo(
    () => new Map(outdoor.map((d) => [d.date, d.avg_c])),
    [outdoor],
  );
  const indoorByDate = useMemo(
    () => new Map(indoor.map((d) => [d.date, d.avg_c])),
    [indoor],
  );

  const kwhVals = slice.map((d) => d.kwh).filter((v): v is number => v != null && v >= 0);
  const tempVals: number[] = [];
  for (const d of slice) {
    if (showOutdoor) {
      const t = outdoorByDate.get(d.date);
      if (t != null) tempVals.push(t);
    }
    if (showIndoor) {
      const t = indoorByDate.get(d.date);
      if (t != null) tempVals.push(t);
    }
  }

  const kwhMax = kwhVals.length ? Math.max(...kwhVals) * 1.15 : 1;
  const kwhMin = 0;
  const tempMin = tempVals.length ? Math.min(...tempVals) - 2 : -10;
  const tempMax = tempVals.length ? Math.max(...tempVals) + 2 : 25;

  const showTempAxis =
    (showOutdoor && slice.some((d) => outdoorByDate.get(d.date) != null)) ||
    (showIndoor && slice.some((d) => indoorByDate.get(d.date) != null));
  const plotW = W - PAD.left - (showTempAxis ? PAD.right : 8);
  const plotH = H - PAD.top - PAD.bottom;
  const barGap = 4;
  const barW = slice.length > 0 ? (plotW - barGap * (slice.length - 1)) / slice.length : plotW;

  const yKwh = (v: number) =>
    PAD.top + (1 - (v - kwhMin) / (kwhMax - kwhMin || 1)) * plotH;
  const yTemp = (v: number) =>
    PAD.top + (1 - (v - tempMin) / (tempMax - tempMin || 1)) * plotH;
  const xBar = (i: number) => PAD.left + i * (barW + barGap) + barW / 2;

  const tempLinePoints = (byDate: Map<string, number | null>) => {
    const pts: { x: number; y: number; date: string }[] = [];
    slice.forEach((d, i) => {
      const v = byDate.get(d.date);
      if (v != null) pts.push({ x: xBar(i), y: yTemp(v), date: d.date });
    });
    return pts;
  };

  const outdoorPts = showOutdoor ? tempLinePoints(outdoorByDate) : [];
  const indoorPts = showIndoor ? tempLinePoints(indoorByDate) : [];

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || slice.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    slice.forEach((_, i) => {
      const cx = xBar(i);
      const dist = Math.abs(relX - cx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHoverIdx(bestDist < barW ? best : null);
  };

  if (slice.length === 0) {
    return <p className="text-sm text-stone-500">Ei kulutushistoriaa valitulla aikavälillä.</p>;
  }

  const hover = hoverIdx != null ? slice[hoverIdx] : null;

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-stone-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
          kWh
        </span>
        {hasOutdoor && (
          <button
            type="button"
            onClick={onToggleOutdoor}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 transition ${
              showOutdoor ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200" : "text-stone-400 line-through"
            }`}
          >
            <span className="inline-block h-0 w-3 border-t border-dashed border-sky-600" />
            Ulko
          </button>
        )}
        {hasIndoor && (
          <button
            type="button"
            onClick={onToggleIndoor}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 transition ${
              showIndoor ? "bg-rose-50 text-rose-900 ring-1 ring-rose-200" : "text-stone-400 line-through"
            }`}
          >
            <span className="inline-block h-0 w-3 border-t border-dashed border-rose-500" />
            Sisä
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label="Kulutustrendi"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const v = kwhMin + (kwhMax - kwhMin) * (1 - frac);
          const y = PAD.top + frac * plotH;
          return (
            <g key={`kwh-${frac}`}>
              <line x1={PAD.left} y1={y} x2={W - (showTempAxis ? PAD.right : 8)} y2={y} stroke="#e7e5e4" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#a8a29e" fontSize="9">
                {v < 10 ? v.toFixed(1) : Math.round(v)}
              </text>
            </g>
          );
        })}

        {(showOutdoor || showIndoor) && showTempAxis &&
          [0, 0.5, 1].map((frac) => {
            const v = tempMin + (tempMax - tempMin) * (1 - frac);
            const y = PAD.top + frac * plotH;
            return (
              <text
                key={`temp-${frac}`}
                x={W - PAD.right + 4}
                y={y + 3}
                textAnchor="start"
                fill="#94a3b8"
                fontSize="8"
              >
                {v.toFixed(0)}°
              </text>
            );
          })}

        {slice.map((d, i) => {
          const kwh = d.kwh ?? 0;
          const h = d.kwh != null ? Math.max(2, (kwh / kwhMax) * plotH) : 2;
          const x = PAD.left + i * (barW + barGap);
          const y = PAD.top + plotH - h;
          const isToday = d.label === "Tänään";
          const isHover = hoverIdx === i;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={3}
              fill={isHover ? "#d97706" : isToday ? "#f59e0b" : "#d6d3d1"}
            />
          );
        })}

        {renderTempLine(outdoorPts, "#0284c7")}
        {renderTempLine(indoorPts, "#e11d48")}

        {hoverIdx != null && (
          <line
            x1={xBar(hoverIdx)}
            y1={PAD.top}
            x2={xBar(hoverIdx)}
            y2={H - PAD.bottom}
            stroke="#78716c"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg"
        >
          <p className="font-medium text-stone-800">{hover.label}</p>
          <p className="text-stone-600">
            Kulutus: {hover.kwh != null ? `${hover.kwh.toFixed(2)} kWh` : "—"}
          </p>
          {showOutdoor && outdoorByDate.get(hover.date) != null && (
            <p className="text-stone-600">
              Ulko: {outdoorByDate.get(hover.date)!.toFixed(1)} °C
            </p>
          )}
          {showIndoor && indoorByDate.get(hover.date) != null && (
            <p className="text-stone-600">
              Sisä: {indoorByDate.get(hover.date)!.toFixed(1)} °C
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function renderTempLine(
  pts: { x: number; y: number }[],
  color: string,
): React.ReactNode {
  if (pts.length < 2) return null;
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="5 4"
    />
  );
}
