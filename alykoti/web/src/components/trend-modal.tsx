"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendChart } from "@/components/trend-chart";
import type { MetricHistory, MetricPoint, MetricRange } from "@/lib/metric-samples";

const RANGES: { id: MetricRange; label: string }[] = [
  { id: "day", label: "Päivä" },
  { id: "week", label: "Viikko" },
  { id: "month", label: "Kuukausi" },
];

type Props = {
  metric: string;
  onClose: () => void;
};

export function TrendModal({ metric, onClose }: Props) {
  const [range, setRange] = useState<MetricRange>("day");
  const [history, setHistory] = useState<MetricHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/device/history?metric=${encodeURIComponent(metric)}&range=${range}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        setHistory(await res.json());
      } else {
        setHistory(null);
      }
    } finally {
      setLoading(false);
    }
  }, [metric, range]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  const title = history?.label ?? "Trendi";
  const rangeLabel = history?.rangeLabel ?? RANGES.find((r) => r.id === range)?.label ?? "";

  const series =
    history?.series ??
    (history
      ? [
          {
            key: history.metric,
            label: "Arvo",
            style: "primary" as const,
            points: history.points,
          },
        ]
      : []);

  const primaryPoints = series.find((s) => s.style === "primary")?.points ?? [];
  const secondaryPoints = series.find((s) => s.style === "secondary")?.points ?? [];
  const numericPoints = primaryPoints.filter((p): p is MetricPoint & { v: number } => p.v != null);
  const secondaryNumeric = secondaryPoints.filter(
    (p): p is MetricPoint & { v: number } => p.v != null,
  );

  const stats =
    numericPoints.length > 0
      ? {
          min: Math.min(...numericPoints.map((p) => p.v)),
          max: Math.max(...numericPoints.map((p) => p.v)),
          avg: numericPoints.reduce((s, p) => s + p.v, 0) / numericPoints.length,
          latest: numericPoints[numericPoints.length - 1]?.v,
          targetLatest: secondaryNumeric[secondaryNumeric.length - 1]?.v,
        }
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="trend-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="trend-title" className="text-lg font-bold text-stone-900">
              {title}
            </h2>
            <p className="text-xs text-stone-500">{rangeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
          >
            Sulje
          </button>
        </div>

        <div className="mt-3 flex gap-1 rounded-xl bg-stone-100 p-1" role="tablist">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={range === r.id}
              onClick={() => setRange(r.id)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                range === r.id
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {loading && (
          <p className="mt-6 text-sm text-stone-500">Ladataan historiaa…</p>
        )}

        {!loading && history && history.points.length === 0 && (
          <p className="mt-6 text-sm text-stone-500">
            Ei vielä historiaa tälle aikavälille. Data kertyy synkin myötä.
          </p>
        )}

        {!loading && history && history.points.length > 0 && history.kind === "numeric" && (
          <>
            {history.seriesGapNote && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
                {history.seriesGapNote}
              </p>
            )}
            {history.footnote && (
              <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-700">
                {history.footnote}
              </p>
            )}
            {stats && (
              <dl
                className={`mt-4 grid gap-2 text-center text-xs ${
                  metric.includes("fan") && stats.targetLatest != null
                    ? "grid-cols-2 sm:grid-cols-5"
                    : "grid-cols-4"
                }`}
              >
                {metric.includes("fan") && stats.targetLatest != null ? (
                  <>
                    <Stat label="Kone nyt" value={formatVal(stats.latest, history.unit)} />
                    <Stat label="Tavoite nyt" value={formatVal(stats.targetLatest, history.unit)} />
                    <Stat
                      label="Ero"
                      value={formatVal(
                        (stats.latest ?? 0) - stats.targetLatest,
                        history.unit,
                      )}
                    />
                  </>
                ) : (
                  <Stat label="Nyt" value={formatVal(stats.latest, history.unit)} />
                )}
                <Stat label="Min" value={formatVal(stats.min, history.unit)} />
                <Stat label="Max" value={formatVal(stats.max, history.unit)} />
                {!metric.includes("fan") && (
                  <Stat label="Keski" value={formatVal(stats.avg, history.unit)} />
                )}
              </dl>
            )}
            <div className="mt-4">
              <TrendChart
                metric={history.metric}
                unit={history.unit}
                series={series}
                rangeStart={history.rangeStart}
                rangeEnd={history.rangeEnd}
              />
            </div>
          </>
        )}

        {!loading && history && history.points.length > 0 && history.kind === "categorical" && (
          <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto text-sm">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-semibold text-stone-900">{value}</dd>
    </div>
  );
}

function formatVal(v: number | undefined, unit?: string): string {
  if (v == null) return "—";
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
