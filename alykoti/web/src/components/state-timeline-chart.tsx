"use client";

import { useMemo } from "react";
import type { MetricPoint } from "@/lib/metric-samples";

type Props = {
  points: MetricPoint[];
  rangeStart: string;
  rangeEnd: string;
};

const W = 560;
const H = 120;
const PAD = { top: 12, right: 12, bottom: 24, left: 12 };

export function StateTimelineChart({ points, rangeStart, rangeEnd }: Props) {
  const segments = useMemo(() => buildSegments(points, rangeEnd), [points, rangeEnd]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const t0 = new Date(rangeStart).getTime();
  const t1 = new Date(rangeEnd).getTime();
  const span = Math.max(t1 - t0, 1);

  const xForTime = (iso: string) => {
    const ratio = (new Date(iso).getTime() - t0) / span;
    return PAD.left + Math.max(0, Math.min(1, ratio)) * plotW;
  };

  if (segments.length === 0) {
    return <p className="text-sm text-stone-500">Ei tilahistoriaa valitulla aikavälillä.</p>;
  }

  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-stone-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded bg-emerald-200" />
          Pois / OK
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded bg-amber-400" />
          Päällä / aktiivinen
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tilahistoria">
        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={plotH}
          fill="#fafaf9"
          rx={4}
        />
        {segments.map((seg, i) => {
          const x1 = xForTime(seg.start);
          const x2 = xForTime(seg.end);
          const w = Math.max(2, x2 - x1);
          const active = seg.v === 1;
          return (
            <rect
              key={`${seg.start}-${i}`}
              x={x1}
              y={PAD.top + (active ? 0 : plotH * 0.45)}
              width={w}
              height={active ? plotH : plotH * 0.55}
              fill={active ? "#fbbf24" : "#a7f3d0"}
              rx={2}
            />
          );
        })}
        <text x={PAD.left} y={H - 6} fill="#a8a29e" fontSize="8">
          {formatTimeShort(rangeStart)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fill="#a8a29e" fontSize="8">
          {formatTimeShort(rangeEnd)}
        </text>
      </svg>
    </div>
  );
}

type Segment = { start: string; end: string; v: number; text: string | null };

function buildSegments(points: MetricPoint[], rangeEnd: string): Segment[] {
  const sorted = [...points].sort(
    (a, b) => new Date(a.t).getTime() - new Date(b.t).getTime(),
  );
  if (sorted.length === 0) return [];

  const segments: Segment[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    const v = p.v ?? (p.text ? 1 : 0);
    const start = p.t;
    const end = sorted[i + 1]?.t ?? rangeEnd;
    segments.push({ start, end, v, text: p.text });
  }

  return segments;
}

function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
