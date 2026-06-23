"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { MetricPoint, MetricSeries } from "@/lib/metric-samples";

type Props = {
  metric: string;
  unit?: string;
  series: MetricSeries[];
  rangeStart: string;
  rangeEnd: string;
};

const W = 560;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

export function TrendChart({ metric, unit, series, rangeStart, rangeEnd }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{
    time: string;
    x: number;
    y: number;
  } | null>(null);

  const primary = series.find((s) => s.style === "primary") ?? series[0];
  const secondary = series.find((s) => s.style === "secondary");

  const primaryNumeric = useMemo(
    () => primary.points.filter((p): p is MetricPoint & { v: number } => p.v != null),
    [primary.points],
  );

  const allValues = useMemo(() => {
    const vals: number[] = [];
    for (const s of series) {
      for (const p of s.points) {
        if (p.v != null) vals.push(p.v);
      }
    }
    return vals;
  }, [series]);

  const { yMin, yMax } = useMemo(() => {
    if (allValues.length === 0) return { yMin: 0, yMax: 100 };
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const pad = (max - min) * 0.08 || 5;
    return {
      yMin: metric.includes("fan") ? Math.max(0, min - pad) : min - pad,
      yMax: max + pad,
    };
  }, [allValues, metric]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const t0 = new Date(rangeStart).getTime();
  const t1 = new Date(rangeEnd).getTime();
  const span = Math.max(t1 - t0, 1);

  const xForTime = useCallback(
    (iso: string) => {
      const ratio = (new Date(iso).getTime() - t0) / span;
      return PAD.left + Math.max(0, Math.min(1, ratio)) * plotW;
    },
    [t0, span, plotW],
  );

  const yForValue = useCallback(
    (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH,
    [yMin, yMax, plotH],
  );

  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / steps);
  }, [yMin, yMax]);

  const xTimeTicks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => {
      const t = t0 + (span * i) / (count - 1);
      return new Date(t).toISOString();
    });
  }, [t0, span]);

  const useSpeedGradient = false;

  const nearestPoint = useCallback(
    (targetT: number) => {
      if (primaryNumeric.length === 0) return null;
      let best = primaryNumeric[0]!;
      let bestDiff = Math.abs(new Date(best.t).getTime() - targetT);
      for (const p of primaryNumeric) {
        const diff = Math.abs(new Date(p.t).getTime() - targetT);
        if (diff < bestDiff) {
          best = p;
          bestDiff = diff;
        }
      }
      return best;
    },
    [primaryNumeric],
  );

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || primaryNumeric.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    if (relX < PAD.left || relX > W - PAD.right) {
      setHover(null);
      return;
    }
    const ratio = (relX - PAD.left) / plotW;
    const hoverT = t0 + ratio * span;
    const point = nearestPoint(hoverT);
    if (!point) return;
    setHover({
      time: point.t,
      x: xForTime(point.t),
      y: yForValue(point.v),
    });
  };

  const valueAt = (pts: MetricPoint[], targetT: string): number | null => {
    if (pts.length === 0) return null;
    const target = new Date(targetT).getTime();
    let best = pts[0]!;
    let bestDiff = Math.abs(new Date(best.t).getTime() - target);
    for (const p of pts) {
      const diff = Math.abs(new Date(p.t).getTime() - target);
      if (diff < bestDiff) {
        best = p;
        bestDiff = diff;
      }
    }
    return best.v;
  };

  const hoverTime = hover?.time ?? null;

  return (
    <div className="relative">
      {series.length > 1 && (
        <div className="mb-3 space-y-1 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 rounded bg-emerald-600" />
              Koneen nopeus — mitä laite mittaa
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-5 border-t-2 border-dashed border-sky-600" />
              Automaatin tavoite — mitä ohjaus pyytää
            </span>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Trendikäyrä"
      >
        {yTicks.map((tick) => {
          const y = yForValue(tick);
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="#e7e5e4"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                fill="#a8a29e"
                fontSize="9"
              >
                {formatAxis(tick, unit)}
              </text>
            </g>
          );
        })}

        {xTimeTicks.map((t) => {
          const x = xForTime(t);
          return (
            <g key={t}>
              <line
                x1={x}
                y1={PAD.top}
                x2={x}
                y2={H - PAD.bottom}
                stroke="#f5f5f4"
                strokeWidth="1"
              />
              <text
                x={x}
                y={H - 8}
                textAnchor="middle"
                fill="#a8a29e"
                fontSize="8"
              >
                {formatTimeShort(t)}
              </text>
            </g>
          );
        })}

        {secondary &&
          renderLine(
            secondary.points.filter((p): p is MetricPoint & { v: number } => p.v != null),
            "#0284c7",
            true,
            xForTime,
            yForValue,
            false,
          )}

        {renderLine(
          primaryNumeric,
          metric.includes("fan") ? "#059669" : lineColor(metric),
          false,
          xForTime,
          yForValue,
          useSpeedGradient,
        )}

        <line
          x1={xForTime(rangeEnd)}
          y1={PAD.top}
          x2={xForTime(rangeEnd)}
          y2={H - PAD.bottom}
          stroke="#d6d3d1"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {hover && hoverTime && (
          <>
            <line
              x1={hover.x}
              y1={PAD.top}
              x2={hover.x}
              y2={H - PAD.bottom}
              stroke="#78716c"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={hover.x} cy={hover.y} r="4" fill="#1c1917" stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>

      {hover && hoverTime && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(hover.x / W) * 100}%`,
            top: 8,
            transform: "translateX(-50%)",
          }}
        >
          <p className="font-medium text-stone-800">{formatTimeFull(hoverTime)}</p>
          {series.map((s) => {
            const v = valueAt(s.points, hoverTime);
            return (
              <p key={s.key} className="mt-0.5 text-stone-600">
                <span className="font-medium text-stone-800">{s.label}:</span>{" "}
                {v != null ? formatVal(v, unit) : "—"}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderLine(
  points: (MetricPoint & { v: number })[],
  color: string | null,
  dashed: boolean,
  xForTime: (iso: string) => number,
  yForValue: (v: number) => number,
  gradientBySpeed: boolean,
) {
  if (points.length === 0) return null;

  if (points.length === 1) {
    const x = xForTime(points[0]!.t);
    const y = yForValue(points[0]!.v);
    return <circle cx={x} cy={y} r="3" fill={color ?? speedColor(points[0]!.v)} />;
  }

  const segments = splitPointsByGap(points, inferMaxGapMs(points));

  return (
    <g>
      {segments.map((seg, segIdx) => {
        if (seg.length < 2) {
          const p = seg[0]!;
          const x = xForTime(p.t);
          const y = yForValue(p.v);
          return (
            <circle
              key={`${p.t}-dot-${segIdx}`}
              cx={x}
              cy={y}
              r="3"
              fill={color ?? speedColor(p.v)}
            />
          );
        }

        if (gradientBySpeed) {
          return (
            <g key={`seg-${segIdx}`}>
              {seg.slice(0, -1).map((p, i) => {
                const next = seg[i + 1]!;
                const x1 = xForTime(p.t);
                const y1 = yForValue(p.v);
                const x2 = xForTime(next.t);
                const y2 = yForValue(next.v);
                const mid = (p.v + next.v) / 2;
                return (
                  <line
                    key={`${p.t}-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={speedColor(mid)}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          );
        }

        const d = seg
          .map((p, i) => {
            const x = xForTime(p.t);
            const y = yForValue(p.v);
            return `${i === 0 ? "M" : "L"}${x},${y}`;
          })
          .join(" ");

        return (
          <path
            key={`seg-${segIdx}`}
            d={d}
            fill="none"
            stroke={color ?? "#57534e"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dashed ? "6 4" : undefined}
          />
        );
      })}
    </g>
  );
}

/** Älä yhdistä pisteitä viivalla jos mittauksia puuttuu — estää harhaanjohtavan kaato-viivan. */
function inferMaxGapMs(points: (MetricPoint & { v: number })[]): number {
  if (points.length < 2) return 5 * 60 * 1000;
  const gaps: number[] = [];
  for (let i = 1; i < points.length; i++) {
    gaps.push(new Date(points[i]!.t).getTime() - new Date(points[i - 1]!.t).getTime());
  }
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] ?? 60_000;
  // 3× tyypillinen väli, vähintään 3 min, enintään 15 min
  return Math.min(15 * 60 * 1000, Math.max(3 * 60 * 1000, median * 3));
}

function splitPointsByGap(
  points: (MetricPoint & { v: number })[],
  maxGapMs: number,
): (MetricPoint & { v: number })[][] {
  const segments: (MetricPoint & { v: number })[][] = [];
  let current: (MetricPoint & { v: number })[] = [points[0]!];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const p = points[i]!;
    const gap = new Date(p.t).getTime() - new Date(prev.t).getTime();
    if (gap > maxGapMs) {
      segments.push(current);
      current = [p];
    } else {
      current.push(p);
    }
  }
  segments.push(current);
  return segments;
}

/** Hidas vihreä → keltainen → oranssi → nopea punainen */
export function speedColor(pct: number): string {
  const v = Math.max(0, Math.min(100, pct)) / 100;
  if (v <= 0.33) {
    const t = v / 0.33;
    return lerpColor("#22c55e", "#eab308", t);
  }
  if (v <= 0.66) {
    const t = (v - 0.33) / 0.33;
    return lerpColor("#eab308", "#f97316", t);
  }
  const t = (v - 0.66) / 0.34;
  return lerpColor("#f97316", "#ef4444", t);
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${bl})`;
}

function lineColor(metric: string): string {
  if (metric.includes("temp")) return "#0284c7";
  if (metric.includes("lto")) return "#059669";
  if (metric === "co2_ppm") return "#d97706";
  return "#57534e";
}

function formatAxis(v: number, unit?: string): string {
  const n = Math.abs(v) >= 100 ? Math.round(v) : v.toFixed(v % 1 === 0 ? 0 : 1);
  return unit === "%" ? `${n}` : unit ? `${n}` : String(n);
}

function formatVal(v: number, unit?: string): string {
  const n = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return unit ? `${n} ${unit}` : n;
}

function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeFull(iso: string): string {
  return new Date(iso).toLocaleString("fi-FI", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
