"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EnergyPhaseReading, EnergyPhases } from "@/lib/types";

type MeterLive = {
  power_w: number | null;
  power_kw: number | null;
  energy_wh: number | null;
  phases: EnergyPhases;
};

type DailyEnergy = {
  date: string;
  label: string;
  kwh: number | null;
};

type EnergyMeter = {
  id: string;
  name: string;
  host?: string;
  model?: string;
  live: MeterLive;
  today_kwh: number | null;
  daily: DailyEnergy[];
};

type EnergyResponse = {
  hubOnline?: boolean;
  meters: EnergyMeter[];
};

const PHASES = ["a", "b", "c"] as const;
const PHASE_LABELS: Record<(typeof PHASES)[number], string> = {
  a: "L1",
  b: "L2",
  c: "L3",
};

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

function phasePowerKw(p?: EnergyPhaseReading): number | null {
  if (!p) return null;
  if (p.power_kw != null && Number.isFinite(p.power_kw)) return p.power_kw;
  if (p.power_w != null && Number.isFinite(p.power_w)) return p.power_w / 1000;
  return null;
}

function totalPowerKw(live: MeterLive): number | null {
  if (live.power_kw != null && Number.isFinite(live.power_kw)) return live.power_kw;
  if (live.power_w != null && Number.isFinite(live.power_w)) return live.power_w / 1000;

  const phases = live.phases ?? {};
  let sum = 0;
  let any = false;
  for (const key of PHASES) {
    const kw = phasePowerKw(phases[key]);
    if (kw != null) {
      sum += kw;
      any = true;
    }
  }
  return any ? sum : null;
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
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[20rem] text-sm">
        <thead>
          <tr className="border-b border-stone-100 text-left text-xs text-stone-500">
            <th className="pb-2 pr-4 font-medium">Vaihe</th>
            <th className="pb-2 pr-4 font-medium">Jännite</th>
            <th className="pb-2 pr-4 font-medium">Virta</th>
            <th className="pb-2 font-medium">Teho</th>
          </tr>
        </thead>
        <tbody>
          {PHASES.map((key) => {
            const p = phases[key];
            return (
              <tr key={key} className="border-b border-stone-50">
                <td className="py-2 pr-4 font-medium text-stone-800">{PHASE_LABELS[key]}</td>
                <td className="py-2 pr-4 tabular-nums text-stone-700">
                  {p?.voltage_v != null ? `${fmtNum(p.voltage_v, 0)} V` : "—"}
                </td>
                <td className="py-2 pr-4 tabular-nums text-stone-700">
                  {p?.current_a != null ? `${fmtNum(p.current_a, 2)} A` : "—"}
                </td>
                <td className="py-2 tabular-nums text-stone-700">{fmtKw(phasePowerKw(p))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{meter.name}</h2>
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

export function EnergyPanel() {
  const [data, setData] = useState<EnergyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/energy", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch_failed");
      setData((await res.json()) as EnergyResponse);
      setError(null);
    } catch {
      setError("Energiatietojen haku epäonnistui");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8_000);
    return () => clearInterval(id);
  }, [load]);

  if (error && !data) {
    return (
      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        {error}
      </div>
    );
  }

  if (!data) {
    return <p className="mt-6 text-sm text-stone-500">Ladataan energiamittauksia…</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      {data.hubOnline === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Yellow offline — live-mittaukset päivittyvät kun keskusyksikkö synkkaa.
        </div>
      )}

      {data.meters.length === 0 ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Ei energiamittaria</h2>
          <p className="mt-2 text-sm text-stone-600">
            Lisää Shelly EM -laite{" "}
            <a href="/laitteet/shelly" className="font-medium text-stone-900 underline">
              Shelly-sivulla
            </a>
            . Mittari näkyy täällä kun Yellow on synkannut laitteen.
          </p>
        </section>
      ) : (
        data.meters.map((meter) => <MeterCard key={meter.id} meter={meter} />)
      )}
    </div>
  );
}
