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
};

const W = 560;
const H = 240;
const PAD = { top: 16, right: 44, bottom: 32, left: 40 };

export function EnergyTrendChart({
  daily,
  outdoor = [],
  indoor = [],
  showOutdoor,
  showIndoor,
  lastNDays,
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

  const plotW = W - PAD.left - PAD.right;
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
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-stone-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
          Kulutus (kWh)
        </span>
        {showOutdoor && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-5 border-t-2 border-dashed border-sky-600" />
            Ulkolämpö (°C)
          </span>
        )}
        {showIndoor && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-5 border-t-2 border-dashed border-rose-500" />
            Sisälämpö (°C)
          </span>
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
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e7e5e4" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#a8a29e" fontSize="9">
                {v < 10 ? v.toFixed(1) : Math.round(v)}
              </text>
            </g>
          );
        })}

        {(showOutdoor || showIndoor) &&
          [0, 0.5, 1].map((frac) => {
            const v = tempMin + (tempMax - tempMin) * (1 - frac);
            const y = PAD.top + frac * plotH;
            return (
              <text
                key={`temp-${frac}`}
                x={W - PAD.right + 6}
                y={y + 3}
                textAnchor="start"
                fill="#94a3b8"
                fontSize="9"
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
