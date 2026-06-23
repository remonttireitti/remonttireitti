"use client";

import type { MetricHistory } from "@/lib/metric-samples";

type Props = {
  history: MetricHistory | null;
  loading: boolean;
  onClose: () => void;
};

export function TrendModal({ history, loading, onClose }: Props) {
  if (!history && !loading) return null;

  const title = history?.label ?? "Trendi";
  const numericPoints =
    history?.kind === "numeric"
      ? (history.points.filter((p) => p.v != null) as { t: string; v: number }[])
      : [];

  const stats =
    numericPoints.length > 0
      ? {
          min: Math.min(...numericPoints.map((p) => p.v)),
          max: Math.max(...numericPoints.map((p) => p.v)),
          avg:
            numericPoints.reduce((s, p) => s + p.v, 0) / numericPoints.length,
          latest: numericPoints[numericPoints.length - 1]?.v,
        }
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="trend-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="trend-title" className="text-lg font-bold text-stone-900">
              {title}
            </h2>
            <p className="text-xs text-stone-500">Viimeiset 24 h</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
          >
            Sulje
          </button>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-stone-500">Ladataan historiaa…</p>
        )}

        {!loading && history && history.points.length === 0 && (
          <p className="mt-6 text-sm text-stone-500">
            Ei vielä historiaa. Data kertyy synkin ja pingin myötä.
          </p>
        )}

        {!loading && history && history.points.length > 0 && history.kind === "numeric" && (
          <>
            {history.footnote && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-950">
                {history.footnote}
              </p>
            )}
            {stats && (
              <dl className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                <Stat label="Nyt" value={formatVal(stats.latest, history.unit)} />
                <Stat label="Min" value={formatVal(stats.min, history.unit)} />
                <Stat label="Max" value={formatVal(stats.max, history.unit)} />
                <Stat label="Keski" value={formatVal(stats.avg, history.unit)} />
              </dl>
            )}
            <div className="mt-4">
              <TrendSparkline
                points={numericPoints}
                unit={history.unit}
                color={sparkColor(history.metric)}
              />
            </div>
          </>
        )}

        {!loading && history && history.points.length > 0 && history.kind === "categorical" && (
          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm">
            {[...history.points].reverse().map((p, i) => (
              <li
                key={`${p.t}-${i}`}
                className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2"
              >
                <span className="font-medium text-stone-800">
                  {p.text ?? (p.v != null ? String(p.v) : "—")}
                </span>
                <span className="text-xs text-stone-500">{formatTime(p.t)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TrendSparkline({
  points,
  unit,
  color,
}: {
  points: { t: string; v: number }[];
  unit?: string;
  color: string;
}) {
  const w = 320;
  const h = 120;
  const pad = 8;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (p.v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={coords.join(" ")}
        />
        {coords.length > 0 && (() => {
          const last = coords[coords.length - 1].split(",");
          return (
            <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
          );
        })()}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-stone-500">
        <span>{formatTime(first.t)}</span>
        <span>
          {formatVal(last.v, unit)}
        </span>
        <span>{formatTime(last.t)}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-semibold text-stone-900">{value}</dd>
    </div>
  );
}

function formatVal(v: number, unit?: string): string {
  const n = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return unit ? `${n} ${unit}` : n;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sparkColor(metric: string): string {
  if (metric.includes("temp")) return "#0284c7";
  if (metric.includes("fan") || metric.includes("lto")) return "#059669";
  if (metric === "co2_ppm") return "#d97706";
  if (metric.includes("online")) return "#64748b";
  return "#57534e";
}
