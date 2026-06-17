"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatPriceCents,
  priceBarColor,
  type ElectricityPrices,
} from "@/lib/electricity-prices";

const HELSINKI = "Europe/Helsinki";

type Props = {
  initial: ElectricityPrices | null;
};

export function ElectricityPricePanel({ initial }: Props) {
  const [data, setData] = useState<ElectricityPrices | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/electricity/prices", { cache: "no-store" });
        if (!res.ok) throw new Error("hintojen haku epäonnistui");
        const json = (await res.json()) as ElectricityPrices;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Hintojen päivitys epäonnistui");
      }
    }

    const id = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const chartHours = useMemo(() => {
    if (!data) return [];
    return data.tomorrow
      ? [...data.today.hours, ...data.tomorrow.hours]
      : data.today.hours;
  }, [data]);

  const chartMin = useMemo(() => {
    if (!chartHours.length) return 0;
    return Math.min(...chartHours.map((h) => h.centsPerKwh));
  }, [chartHours]);

  const chartMax = useMemo(() => {
    if (!chartHours.length) return 1;
    return Math.max(...chartHours.map((h) => h.centsPerKwh));
  }, [chartHours]);

  const nowMarker = useMemo(() => {
    if (!chartHours.length) return null;
    const t = now.getTime();
    let index = 0;
    for (let i = 0; i < chartHours.length; i++) {
      if (new Date(chartHours[i]!.at).getTime() <= t) index = i;
    }
    const slotStart = new Date(chartHours[index]!.at).getTime();
    const nextStart =
      index + 1 < chartHours.length
        ? new Date(chartHours[index + 1]!.at).getTime()
        : slotStart + 3_600_000;
    const progress = Math.min(
      1,
      Math.max(0, (t - slotStart) / Math.max(1, nextStart - slotStart)),
    );
    return { index, progress };
  }, [chartHours, now]);

  if (!data) {
    return (
      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">Sähkön hinta</h2>
        <p className="mt-3 text-sm text-stone-500">
          {error ?? "Ladataan pörssihintoja…"}
        </p>
      </section>
    );
  }

  const currentCents = data.current?.centsPerKwh ?? null;
  const nextCents = data.next?.centsPerKwh ?? null;
  const yMax = Math.ceil(chartMax * 1.15 * 10) / 10;
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  return (
    <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-stone-900">Sähkön hinta</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Nord Pool · {data.region} · {data.source}
          </p>
        </div>
        <p className="text-xs text-stone-400">
          Päivitetty{" "}
          {new Date(data.updatedAt).toLocaleString("fi-FI", {
            timeZone: HELSINKI,
            day: "numeric",
            month: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {error && (
        <p className="mt-2 text-xs text-amber-700">{error}</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Hinta nyt" value={formatPriceCents(currentCents)} />
        <SummaryCard
          label="Seuraava"
          value={formatPriceCents(nextCents)}
          tone="blue"
        />
        <SummaryCard
          label="Halvin tänään"
          value={formatPriceCents(data.today.minCents)}
          tone="green"
        />
        <SummaryCard
          label="Keskihinta tänään"
          value={formatPriceCents(data.today.avgCents)}
          tone="amber"
        />
        <SummaryCard
          label="Kallein tänään"
          value={formatPriceCents(data.today.maxCents)}
          tone="red"
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg
          viewBox="0 0 920 280"
          className="h-auto w-full min-w-[640px]"
          role="img"
          aria-label="Sähkön tuntihinnat tänään ja huomenna"
        >
          <text x="8" y="16" fill="#78716c" fontSize="11">
            c/kWh
          </text>

          {yTicks.map((tick) => {
            const y = 240 - (tick / yMax) * 200;
            return (
              <g key={tick}>
                <line
                  x1="48"
                  y1={y}
                  x2="900"
                  y2={y}
                  stroke="#e7e5e4"
                  strokeWidth="1"
                />
                <text
                  x="40"
                  y={y + 4}
                  textAnchor="end"
                  fill="#a8a29e"
                  fontSize="10"
                >
                  {tick.toLocaleString("fi-FI", { maximumFractionDigits: 1 })}
                </text>
              </g>
            );
          })}

          {chartHours.map((hour, i) => {
            const barW = 852 / Math.max(chartHours.length, 1);
            const x = 48 + i * barW;
            const h = (hour.centsPerKwh / yMax) * 200;
            const y = 240 - h;
            const hourLabel = new Date(hour.at).toLocaleString("fi-FI", {
              timeZone: HELSINKI,
              hour: "2-digit",
              hour12: false,
            });
            const showLabel = i % 2 === 0;
            const dayKey = new Intl.DateTimeFormat("sv-SE", {
              timeZone: HELSINKI,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(hour.at));
            const prevDay =
              i > 0
                ? new Intl.DateTimeFormat("sv-SE", {
                    timeZone: HELSINKI,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date(chartHours[i - 1]!.at))
                : null;
            const dayBreak = prevDay != null && prevDay !== dayKey;

            return (
              <g key={hour.at}>
                {dayBreak && (
                  <>
                    <line
                      x1={x - 2}
                      y1="28"
                      x2={x - 2}
                      y2="240"
                      stroke="#a8a29e"
                      strokeDasharray="4 3"
                    />
                    <text
                      x={x + 4}
                      y="24"
                      fill="#57534e"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {data.tomorrow?.label ?? "Huomenna"}
                    </text>
                  </>
                )}
                <rect
                  x={x + 1}
                  y={y}
                  width={Math.max(2, barW - 2)}
                  height={h}
                  rx="2"
                  fill={priceBarColor(hour.centsPerKwh, chartMin, chartMax)}
                />
                {showLabel && (
                  <text
                    x={x + barW / 2}
                    y="256"
                    textAnchor="middle"
                    fill="#a8a29e"
                    fontSize="9"
                  >
                    {hourLabel}
                  </text>
                )}
              </g>
            );
          })}

          {nowMarker && chartHours.length > 0 && (
            <g>
              {(() => {
                const barW = 852 / Math.max(chartHours.length, 1);
                const x =
                  48 +
                  nowMarker.index * barW +
                  nowMarker.progress * barW;
                return (
                  <>
                    <line
                      x1={x}
                      y1="28"
                      x2={x}
                      y2="240"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeDasharray="5 4"
                    />
                    <rect x={x - 18} y="8" width="36" height="16" rx="4" fill="#2563eb" />
                    <text
                      x={x}
                      y="19"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="600"
                    >
                      Nyt
                    </text>
                  </>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      <p className="mt-2 text-xs text-stone-500">
        ALV 25,5 % mukana. Tuntipalkit ovat 15 minuutin jaksojen keskiarvoja.
        Hinnat päivittyvät noin minuutin välein.
      </p>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "amber" | "red" | "blue";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : tone === "red"
          ? "text-red-700"
          : tone === "blue"
            ? "text-sky-700"
            : "text-stone-900";

  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}
