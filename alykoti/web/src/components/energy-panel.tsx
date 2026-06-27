"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EnergyTrendChart } from "@/components/energy-trend-chart";
import type {
  DailyEnergy,
  EnergyInsight,
  EnergyModeration,
  EnergyStatistics,
} from "@/lib/energy-samples";
import type { EnergyCostSummary } from "@/lib/energy-cost";
import { formatEur } from "@/lib/energy-cost";
import { meterLivePowerKw } from "@/lib/energy-live";
import { formatPriceCents } from "@/lib/electricity-prices";
import { POLL_ENERGY_FULL_MS, POLL_ENERGY_LIVE_MS } from "@/lib/poll-intervals";
import type { EnergyPhaseReading, EnergyPhases } from "@/lib/types";

type MeterLive = {
  power_w: number | null;
  power_kw: number | null;
  energy_wh: number | null;
  phases: EnergyPhases;
};

type EnergyMeter = {
  id: string;
  name: string;
  host?: string;
  model?: string;
  live: MeterLive;
  today_kwh: number | null;
  daily: DailyEnergy[];
  is_primary?: boolean;
  counts_in_total?: boolean;
};

type EnergyResponse = {
  hubOnline?: boolean;
  primary_meter_id?: string | null;
  summary: {
    power_kw_total: number | null;
    today_kwh: number | null;
    week_kwh: number | null;
    month_kwh: number | null;
    today_kwh_reliable?: boolean;
  };
  moderation: EnergyModeration;
  trend: {
    daily: DailyEnergy[];
    outdoor_temp: { date: string; avg_c: number | null }[];
    indoor_temp: { date: string; avg_c: number | null }[];
  };
  statistics: {
    week: EnergyStatistics;
    month: EnergyStatistics;
  };
  cost: EnergyCostSummary;
  insights: EnergyInsight[];
  meters: EnergyMeter[];
};

const PHASES = ["a", "b", "c"] as const;
const PHASE_LABELS: Record<(typeof PHASES)[number], string> = {
  a: "L1",
  b: "L2",
  c: "L3",
};

const TREND_RANGES = [
  { id: 7, label: "7 pv" },
  { id: 30, label: "30 pv" },
] as const;

const STAT_RANGES = [
  { id: "week" as const, label: "7 päivää" },
  { id: "month" as const, label: "30 päivää" },
];

function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("fi-FI", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtKw(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 10) return `${fmtNum(v, 1)} kW`;
  if (Math.abs(v) >= 1) return `${fmtNum(v, 2)} kW`;
  return `${fmtNum(v * 1000, 0)} W`;
}

function fmtKwh(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${fmtNum(v, 1)} kWh`;
}

function fmtKwhEur(
  kwh: number | null | undefined,
  eur: number | null | undefined,
): string {
  const kwhStr = fmtKwh(kwh);
  const eurStr = formatEur(eur);
  if (kwhStr === "—" && eurStr === "—") return "—";
  if (kwhStr === "—") return eurStr;
  if (eurStr === "—") return kwhStr;
  return `${kwhStr} / ${eurStr}`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(0)} %`;
}

function phasePowerKw(p?: EnergyPhaseReading): number | null {
  if (!p) return null;
  if (p.power_kw != null && Number.isFinite(p.power_kw)) return p.power_kw;
  if (p.power_w != null && Number.isFinite(p.power_w)) return p.power_w / 1000;
  return null;
}

function totalPowerKw(live: MeterLive): number | null {
  return meterLivePowerKw(live);
}

function fmtW(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return `${fmtNum(v / 1000, 2)} kW`;
  return `${fmtNum(v, 0)} W`;
}

function moderationStyles(level: EnergyModeration["level"]) {
  switch (level) {
    case "low":
      return {
        ring: "ring-emerald-200",
        bg: "bg-emerald-50",
        badge: "bg-emerald-100 text-emerald-900 ring-emerald-200",
        bar: "from-emerald-400 to-emerald-600",
        dot: "bg-emerald-500",
      };
    case "moderate":
      return {
        ring: "ring-amber-200",
        bg: "bg-amber-50",
        badge: "bg-amber-100 text-amber-950 ring-amber-200",
        bar: "from-amber-400 to-amber-600",
        dot: "bg-amber-500",
      };
    case "high":
      return {
        ring: "ring-red-200",
        bg: "bg-red-50",
        badge: "bg-red-100 text-red-900 ring-red-200",
        bar: "from-red-400 to-red-600",
        dot: "bg-red-500",
      };
    default:
      return {
        ring: "ring-stone-200",
        bg: "bg-stone-50",
        badge: "bg-stone-100 text-stone-700 ring-stone-200",
        bar: "from-stone-300 to-stone-400",
        dot: "bg-stone-400",
      };
  }
}

function moderationGaugePct(level: EnergyModeration["level"], vsPct: number | null): number {
  if (level === "unknown" || vsPct == null) return 50;
  const clamped = Math.max(-50, Math.min(50, vsPct));
  return 50 + clamped;
}

function insightStyles(tone: EnergyInsight["tone"]) {
  switch (tone) {
    case "positive":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-950";
    default:
      return "border-stone-200 bg-stone-50 text-stone-800";
  }
}

function SummaryHeader({ data }: { data: EnergyResponse }) {
  const { summary, moderation, cost } = data;
  const styles = moderationStyles(moderation.level);
  const gaugePct = moderationGaugePct(moderation.level, moderation.today_vs_avg_pct);
  const hasCost =
    cost.today_cost_eur != null ||
    cost.week_cost_eur != null ||
    cost.month_cost_eur != null ||
    cost.current_price_cents != null;

  return (
    <section className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ring-1 ${styles.ring}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Kokonaiskulutus
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-stone-900">
            {fmtKw(summary.power_kw_total)}
          </p>
          <p className="text-xs text-stone-500">Kokonaisteho nyt (päämittari)</p>
        </div>
        <div className={`rounded-xl px-4 py-2 ring-1 ring-inset ${styles.badge}`}>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">Kulutusarvio</p>
          <p className="text-lg font-bold">{moderation.label}</p>
        </div>
      </div>

      {hasCost && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PeriodStatCard
            label="Tänään"
            value={fmtKwhEur(cost.today_kwh ?? summary.today_kwh, cost.today_cost_eur)}
            sub={
              summary.today_kwh_reliable === false
                ? "lasketaan uudelleen"
                : cost.today_vs_yesterday_pct != null
                  ? `${cost.today_vs_yesterday_pct > 0 ? "+" : ""}${cost.today_vs_yesterday_pct} % vs eilen`
                  : undefined
            }
            subTone={
              cost.today_vs_yesterday_pct != null
                ? cost.today_vs_yesterday_pct > 0
                  ? "warning"
                  : "positive"
                : undefined
            }
          />
          <PeriodStatCard
            label="Viikko"
            value={fmtKwhEur(summary.week_kwh, cost.week_cost_eur)}
            sub={
              cost.week_vs_prev_pct != null
                ? `${cost.week_vs_prev_pct > 0 ? "+" : ""}${cost.week_vs_prev_pct} % vs edellinen`
                : undefined
            }
            subTone={
              cost.week_vs_prev_pct != null
                ? cost.week_vs_prev_pct > 0
                  ? "warning"
                  : "positive"
                : undefined
            }
          />
          <PeriodStatCard
            label="30 päivää"
            value={fmtKwhEur(summary.month_kwh, cost.month_cost_eur)}
          />
          <PeriodStatCard
            label="Spot nyt"
            value={formatPriceCents(cost.current_price_cents)}
            sub={
              cost.today_avg_price_cents != null
                ? `Päivän keski ${formatPriceCents(cost.today_avg_price_cents)}`
                : undefined
            }
          />
        </div>
      )}

      {!hasCost && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PeriodStatCard label="Tänään" value={fmtKwh(summary.today_kwh)} />
          <PeriodStatCard label="Viikko" value={fmtKwh(summary.week_kwh)} />
          <PeriodStatCard label="30 päivää" value={fmtKwh(summary.month_kwh)} />
        </div>
      )}

      <div className={`mt-4 rounded-xl p-4 ${styles.bg}`}>
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-stone-700">{moderation.detail}</p>
          {moderation.today_vs_avg_pct != null && (
            <span className="shrink-0 tabular-nums font-semibold text-stone-900">
              {fmtPct(moderation.today_vs_avg_pct)}
            </span>
          )}
        </div>
        {moderation.level !== "unknown" && (
          <>
            <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-white/70">
              <div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${styles.bar} transition-all duration-700`}
                style={{ width: `${gaugePct}%` }}
              />
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-stone-800 shadow"
                style={{ left: `calc(${gaugePct}% - 6px)` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-stone-500">
              <span>Matala</span>
              <span>Normaali</span>
              <span>Korkea</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function PeriodStatCard({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: "positive" | "warning";
}) {
  const subClass =
    subTone === "warning"
      ? "text-amber-800"
      : subTone === "positive"
        ? "text-emerald-800"
        : "text-stone-500";

  return (
    <div className="rounded-xl bg-stone-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-stone-900 sm:text-xl">{value}</p>
      {sub && <p className={`mt-0.5 text-xs font-medium ${subClass}`}>{sub}</p>}
    </div>
  );
}

function InsightsPanel({
  insights,
  cost,
}: {
  insights: EnergyInsight[];
  cost: EnergyCostSummary;
}) {
  const maxCost = useMemo(() => {
    const vals = cost.daily.map((d) => d.cost_eur);
    return vals.length ? Math.max(...vals) : 1;
  }, [cost.daily]);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Älykäs arvio</h2>
      <p className="mt-1 text-xs text-stone-500">
        Kulutusarviot, päivittäinen kustannus ja havainnot spot-hinnan perusteella.
      </p>

      {cost.daily.length > 1 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-stone-600">Päivittäinen kustannus (€)</p>
          <div className="mt-2 flex h-20 items-end gap-1.5">
            {cost.daily.map((day) => {
              const pct = Math.max(8, (day.cost_eur / maxCost) * 100);
              const isToday = day.label === "Tänään";
              return (
                <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums text-stone-500">
                    {day.cost_eur.toFixed(2)}
                  </span>
                  <div
                    className={`w-full rounded-t-md ${isToday ? "bg-amber-500" : "bg-stone-300"}`}
                    style={{ height: `${pct}%` }}
                    title={`${day.label}: ${day.kwh.toFixed(1)} kWh × ${day.avg_cents_per_kwh.toFixed(1)} c`}
                  />
                  <span className="max-w-full truncate text-[10px] text-stone-500">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {insights.map((item, i) => (
          <li
            key={i}
            className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${insightStyles(item.tone)}`}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrendPanel({ data }: { data: EnergyResponse }) {
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);
  const [showOutdoor, setShowOutdoor] = useState(true);
  const [showIndoor, setShowIndoor] = useState(false);

  const hasOutdoor = useMemo(
    () => data.trend.outdoor_temp.some((d) => d.avg_c != null),
    [data.trend.outdoor_temp],
  );
  const hasIndoor = useMemo(
    () => data.trend.indoor_temp.some((d) => d.avg_c != null),
    [data.trend.indoor_temp],
  );

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Kulutustrendi</h2>
          <p className="text-xs text-stone-500">Päivittäinen kWh — päämittari (L1+L2+L3)</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
          {TREND_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangeDays(r.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                rangeDays === r.id
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <EnergyTrendChart
          daily={data.trend.daily}
          outdoor={data.trend.outdoor_temp}
          indoor={data.trend.indoor_temp}
          showOutdoor={showOutdoor && hasOutdoor}
          showIndoor={showIndoor && hasIndoor}
          lastNDays={rangeDays}
          hasOutdoor={hasOutdoor}
          hasIndoor={hasIndoor}
          onToggleOutdoor={() => setShowOutdoor((v) => !v)}
          onToggleIndoor={() => setShowIndoor((v) => !v)}
        />
      </div>
    </section>
  );
}

function StatisticsPanel({ data }: { data: EnergyResponse }) {
  const [range, setRange] = useState<"week" | "month">("week");
  const stats = data.statistics[range];

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Tilastot</h2>
          <p className="text-xs text-stone-500">Vertailu edelliseen jaksoon ja keskiarvoihin</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
          {STAT_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                range === r.id
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatItem label="Jakson kulutus" value={fmtKwh(stats.period_kwh)} />
        <StatItem
          label="Edellinen jakso"
          value={fmtKwh(stats.prev_period_kwh)}
          sub={
            stats.change_pct != null
              ? `Muutos ${fmtPct(stats.change_pct)}`
              : undefined
          }
        />
        <StatItem label="Päiväkeskiarvo" value={fmtKwh(stats.avg_daily_kwh)} />
        <StatItem
          label="Min / max päivä"
          value={
            stats.min_daily_kwh != null && stats.max_daily_kwh != null
              ? `${fmtNum(stats.min_daily_kwh, 1)} / ${fmtNum(stats.max_daily_kwh, 1)}`
              : "—"
          }
          unit="kWh"
        />
      </dl>

      {stats.avg_daily_kwh != null && (
        <div className="mt-4 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
          <p>
            <span className="font-semibold text-stone-900">{stats.days_above_avg}</span> päivää
            yli keskiarvon ja{" "}
            <span className="font-semibold text-stone-900">{stats.days_below_avg}</span> päivää alle
            keskiarvon (±5 % kynnys).
          </p>
          {stats.change_pct != null && (
            <p className="mt-1 text-xs text-stone-500">
              {stats.change_pct > 5
                ? "Kulutus on noussut edelliseen jaksoon verrattuna."
                : stats.change_pct < -5
                  ? "Kulutus on laskenut edelliseen jaksoon verrattuna."
                  : "Kulutus on pysynyt lähellä edellistä jaksoa."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function StatItem({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/80 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-stone-900">
        {value}
        {unit && value !== "—" && (
          <span className="ml-1 text-sm font-normal text-stone-500">{unit}</span>
        )}
      </dd>
      {sub && <dd className="mt-0.5 text-xs text-stone-500">{sub}</dd>}
    </div>
  );
}

function PhaseTable({ phases }: { phases: EnergyPhases }) {
  const hasAny = PHASES.some((k) => phases[k] != null);
  if (!hasAny) {
    return (
      <p className="mt-3 text-sm text-stone-500">
        Vaiheittaiset mittaukset eivät ole saatavilla — tarkista Shelly EM -yhteys.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="grid gap-3 sm:hidden">
        {PHASES.map((key) => {
          const p = phases[key];
          if (!p) return null;
          return (
            <div key={key} className="rounded-xl border border-stone-100 bg-stone-50 p-3">
              <p className="text-sm font-semibold text-stone-900">{PHASE_LABELS[key]} vaihe</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <div>
                  <dt className="text-xs text-stone-500">Teho</dt>
                  <dd className="tabular-nums font-medium text-stone-800">
                    {p.power_w != null ? fmtW(p.power_w) : fmtKw(phasePowerKw(p))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Jännite</dt>
                  <dd className="tabular-nums font-medium text-stone-800">
                    {p.voltage_v != null ? `${fmtNum(p.voltage_v, 0)} V` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Virta</dt>
                  <dd className="tabular-nums font-medium text-stone-800">
                    {p.current_a != null ? `${fmtNum(p.current_a, 2)} A` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Tehokerroin</dt>
                  <dd className="tabular-nums font-medium text-stone-800">
                    {p.pf != null ? fmtNum(p.pf, 2) : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      <div className="mt-0 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[24rem] text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-left text-xs text-stone-500">
              <th className="pb-2 pr-4 font-medium">Vaihe</th>
              <th className="pb-2 pr-4 font-medium">Teho</th>
              <th className="pb-2 pr-4 font-medium">Jännite</th>
              <th className="pb-2 pr-4 font-medium">Virta</th>
              <th className="pb-2 font-medium">PF</th>
            </tr>
          </thead>
          <tbody>
            {PHASES.map((key) => {
              const p = phases[key];
              return (
                <tr key={key} className="border-b border-stone-50">
                  <td className="py-2 pr-4 font-medium text-stone-800">{PHASE_LABELS[key]}</td>
                  <td className="py-2 pr-4 tabular-nums text-stone-700">
                    {p?.power_w != null ? fmtW(p.power_w) : fmtKw(phasePowerKw(p))}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-stone-700">
                    {p?.voltage_v != null ? `${fmtNum(p.voltage_v, 0)} V` : "—"}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-stone-700">
                    {p?.current_a != null ? `${fmtNum(p.current_a, 2)} A` : "—"}
                  </td>
                  <td className="py-2 tabular-nums text-stone-700">
                    {p?.pf != null ? fmtNum(p.pf, 2) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DailyBars({ daily }: { daily: DailyEnergy[] }) {
  const maxKwh = useMemo(() => {
    const vals = daily.map((d) => d.kwh).filter((v): v is number => v != null && v >= 0);
    return vals.length ? Math.max(...vals) : 1;
  }, [daily]);

  if (daily.length === 0) {
    return <p className="mt-3 text-sm text-stone-500">Ei kulutushistoriaa vielä.</p>;
  }

  return (
    <div className="mt-4">
      <div className="flex h-36 items-end gap-1.5 sm:gap-2">
        {daily.map((day) => {
          const pct =
            day.kwh != null && day.kwh >= 0
              ? Math.max(4, (day.kwh / Math.max(maxKwh, 0.001)) * 100)
              : 4;
          const isToday = day.label === "Tänään";
          return (
            <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-stone-500 sm:text-xs">
                {day.kwh != null ? `${fmtNum(day.kwh, 1)}` : "—"}
              </span>
              <div
                className={`w-full rounded-t-md ${isToday ? "bg-amber-500" : "bg-stone-300"}`}
                style={{ height: `${pct}%` }}
                title={day.kwh != null ? `${day.label}: ${fmtNum(day.kwh, 2)} kWh` : day.label}
              />
              <span className="max-w-full truncate text-[10px] text-stone-500 sm:text-xs">
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-stone-400">Viikon päivittäinen kulutus (kWh)</p>
    </div>
  );
}

function MeterCard({ meter }: { meter: EnergyMeter }) {
  const totalKw = totalPowerKw(meter.live);
  const inTotal = meter.counts_in_total !== false;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-stone-900">{meter.name}</h2>
            {meter.is_primary && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
                Päämittari
              </span>
            )}
            {!inTotal && (
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 ring-1 ring-stone-200">
                Ei kokonaiskulutuksessa
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">
            {[meter.host, meter.model].filter(Boolean).join(" · ") || "Shelly EM"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-stone-900">{fmtKw(totalKw)}</p>
          <p className="text-xs text-stone-500">Kokonaisteho</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-stone-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Tänään</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-stone-900">
            {meter.today_kwh != null ? `${fmtNum(meter.today_kwh, 2)} kWh` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-stone-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Laskuri</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-stone-900">
            {meter.live.energy_wh != null
              ? `${fmtNum(meter.live.energy_wh / 1000, 1)} kWh`
              : "—"}
          </p>
        </div>
      </div>

      <PhaseTable phases={meter.live.phases} />
      <DailyBars daily={meter.daily} />
    </section>
  );
}

type EnergyLiveResponse = {
  hubOnline?: boolean;
  primary_meter_id?: string | null;
  summary: { power_kw_total: number | null };
  meters: EnergyMeter[];
};

const EMPTY_MODERATION: EnergyModeration = {
  level: "unknown",
  label: "Ladataan",
  detail: "Haetaan kulutushistoriaa…",
  today_vs_avg_pct: null,
};

const EMPTY_STATS: EnergyStatistics = {
  range_days: 7,
  period_kwh: null,
  prev_period_kwh: null,
  change_pct: null,
  avg_daily_kwh: null,
  max_daily_kwh: null,
  min_daily_kwh: null,
  days_above_avg: 0,
  days_below_avg: 0,
};

function shellFromLive(live: EnergyLiveResponse): EnergyResponse {
  return {
    hubOnline: live.hubOnline,
    primary_meter_id: live.primary_meter_id,
    summary: {
      power_kw_total: live.summary.power_kw_total,
      today_kwh: null,
      week_kwh: null,
      month_kwh: null,
      today_kwh_reliable: false,
    },
    moderation: EMPTY_MODERATION,
    trend: { daily: [], outdoor_temp: [], indoor_temp: [] },
    statistics: { week: EMPTY_STATS, month: { ...EMPTY_STATS, range_days: 30 } },
    cost: {
      current_price_cents: null,
      today_avg_price_cents: null,
      today_kwh: null,
      today_cost_eur: null,
      yesterday_cost_eur: null,
      today_vs_yesterday_pct: null,
      week_cost_eur: null,
      prev_week_cost_eur: null,
      week_vs_prev_pct: null,
      month_cost_eur: null,
      daily: [],
    },
    insights: [],
    meters: live.meters,
  };
}

function mergeLiveInto(base: EnergyResponse, live: EnergyLiveResponse): EnergyResponse {
  const liveById = new Map(live.meters.map((m) => [m.id, m]));
  return {
    ...base,
    hubOnline: live.hubOnline ?? base.hubOnline,
    primary_meter_id: live.primary_meter_id ?? base.primary_meter_id,
    summary: {
      ...base.summary,
      power_kw_total: live.summary.power_kw_total,
    },
    meters: base.meters.length
      ? base.meters.map((m) => {
          const u = liveById.get(m.id);
          return u ? { ...m, live: u.live } : m;
        })
      : live.meters,
  };
}

export function EnergyPanel({
  variant = "page",
  className = "",
}: {
  /** home = yhteenveto kotisivulla; page = täysi energiasivu mittareineen */
  variant?: "home" | "page";
  className?: string;
}) {
  const [data, setData] = useState<EnergyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullLoaded, setFullLoaded] = useState(false);

  const loadLive = useCallback(async () => {
    try {
      const res = await fetch("/api/energy/live", { cache: "no-store" });
      if (!res.ok) return;
      const live = (await res.json()) as EnergyLiveResponse;
      setData((prev) =>
        prev && fullLoaded ? mergeLiveInto(prev, live) : shellFromLive(live),
      );
      setError(null);
    } catch {
      /* live-päivitys voi epäonnistua hiljaa */
    }
  }, [fullLoaded]);

  const loadFull = useCallback(async () => {
    try {
      const res = await fetch("/api/energy", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch_failed");
      const full = (await res.json()) as EnergyResponse;
      setData(full);
      setFullLoaded(true);
      setError(null);
    } catch {
      setError((prev) => prev ?? "Energiatietojen haku epäonnistui");
    }
  }, []);

  useEffect(() => {
    void loadLive();
    void loadFull();
    const liveId = setInterval(() => void loadLive(), POLL_ENERGY_LIVE_MS);
    const fullId = setInterval(() => void loadFull(), POLL_ENERGY_FULL_MS);
    return () => {
      clearInterval(liveId);
      clearInterval(fullId);
    };
  }, [loadLive, loadFull]);

  if (error && !data) {
    return (
      <div
        className={`rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 ${className}`.trim()}
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <p className={`text-sm text-stone-500 ${variant === "page" ? "mt-6" : ""} ${className}`.trim()}>
        Ladataan energiamittauksia…
      </p>
    );
  }

  return (
    <div className={`space-y-6 ${variant === "page" ? "mt-6" : ""} ${className}`.trim()}>
      {data.hubOnline === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Yellow offline — live-mittaukset päivittyvät kun keskusyksikkö synkkaa.
        </div>
      )}

      {data.meters.length === 0 ? (
        variant === "page" ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Ei energiamittaria</h2>
            <p className="mt-2 text-sm text-stone-600">
              Lisää Shelly EM / 3EM tai sisäisen mittarin omaava kytkin (esim. 1PM){" "}
              <a href="/laitteet/shelly" className="font-medium text-stone-900 underline">
                Shelly-sivulla
              </a>
              . Mittari näkyy täällä kun Yellow on synkannut laitteen (odota ~30 s synkin jälkeen).
            </p>
          </section>
        ) : null
      ) : (
        <>
          <SummaryHeader data={data} />
          <div className="grid gap-6 xl:grid-cols-2">
            <TrendPanel data={data} />
            <InsightsPanel insights={data.insights} cost={data.cost} />
          </div>
          {variant === "page" && <StatisticsPanel data={data} />}

          {variant === "page" ? (
            <div>
              <h2 className="text-base font-semibold text-stone-800">Mittarit</h2>
              <p className="text-xs text-stone-500">
                Yksittäisten laitteiden tiedot — vain päämittari lasketaan kokonaiskulutukseen
              </p>
              <div className="mt-3 space-y-6">
                {data.meters.map((meter) => (
                  <MeterCard key={meter.id} meter={meter} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-stone-500">
              <a href="/energia" className="font-medium text-stone-800 underline hover:text-stone-950">
                Avaa energiasivu → mittarit ja vaiheet
              </a>
            </p>
          )}
        </>
      )}
    </div>
  );
}
