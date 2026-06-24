"use client";

import { useMemo, useState } from "react";
import type { HeatingThermostat } from "@/lib/heating-thermostats";
import type { HubLightDevice } from "@/lib/hub-lights";

const ARC_MIN_C = 15;
const ARC_MAX_C = 30;
const ARC_START = 135;
const ARC_SWEEP = 270;
const CX = 120;
const CY = 120;
const R = 88;
const STROKE = 10;

function clampTemp(v: number): number {
  return Math.max(5, Math.min(35, Math.round(v * 2) / 2));
}

function tempToAngle(temp: number): number {
  const t = Math.max(ARC_MIN_C, Math.min(ARC_MAX_C, temp));
  return ARC_START + ((t - ARC_MIN_C) / (ARC_MAX_C - ARC_MIN_C)) * ARC_SWEEP;
}

function polar(angleDeg: number, radius = R): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function describeArc(startAngle: number, endAngle: number, radius = R): string {
  const start = polar(startAngle, radius);
  const end = polar(endAngle, radius);
  const sweep = endAngle - startAngle;
  const large = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
}

function parseCurrentTemp(sensor?: HubLightDevice): number | null {
  if (sensor?.temperature_c != null && Number.isFinite(sensor.temperature_c)) {
    return sensor.temperature_c;
  }
  const reading = sensor?.readings?.find((r) => r.value.includes("°C"));
  if (reading) {
    const n = Number.parseFloat(reading.value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

type Props = {
  zone: HeatingThermostat;
  sensor?: HubLightDevice;
  actuator?: HubLightDevice;
  pending?: boolean;
  onToggleEnabled: () => void;
  onSetTarget: (target: number) => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function HeatingThermostatCard({
  zone,
  sensor,
  actuator,
  pending,
  onToggleEnabled,
  onSetTarget,
  onEdit,
  onDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const current = parseCurrentTemp(sensor);
  const target = zone.target_temp_c;
  const heatingOn = Boolean(zone.enabled && actuator?.on);
  const half = zone.hysteresis_c / 2;
  const needsHeat =
    current != null && zone.enabled && current < target - half;
  const idle =
    current != null && zone.enabled && current > target + half;

  const statusLabel = !zone.enabled
    ? "Pois käytöstä"
    : needsHeat
      ? "Lämmitys"
      : heatingOn
        ? "Lämmitys"
        : idle
          ? "Odottaa"
          : "Tasapaino";

  const arcEnd = useMemo(() => {
    const display = current ?? target;
    return tempToAngle(display);
  }, [current, target]);

  const targetAngle = tempToAngle(target);
  const targetDot = polar(targetAngle, R);

  const trackPath = describeArc(ARC_START, ARC_START + ARC_SWEEP);
  const valuePath =
    arcEnd > ARC_START + 1 ? describeArc(ARC_START, arcEnd) : "";

  return (
    <article className="relative flex flex-col rounded-2xl border border-stone-200 bg-[#f3f4f6] shadow-sm">
      <div className="flex items-start justify-between px-4 pt-4">
        <div className="min-w-0 pr-2">
          <h3 className="truncate text-base font-semibold text-stone-900">{zone.name}</h3>
          <p className="text-xs text-stone-500">{statusLabel}</p>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Valikko"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-white/80"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Sulje valikko"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-50"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                >
                  Muokkaa
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  Poista
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[240px] px-2 py-2">
        <svg viewBox="0 0 240 200" className="w-full" aria-hidden>
          <path
            d={trackPath}
            fill="none"
            stroke="#d6d3d1"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {valuePath && (
            <path
              d={valuePath}
              fill="none"
              stroke={heatingOn || needsHeat ? "#f97316" : "#a8a29e"}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          )}
          <circle
            cx={targetDot.x}
            cy={targetDot.y}
            r={7}
            fill="#f97316"
            stroke="#fff"
            strokeWidth={2}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
          <p className="text-4xl font-semibold tabular-nums tracking-tight text-stone-900">
            {current != null ? `${current.toFixed(1)}` : "—"}
            <span className="ml-0.5 text-2xl font-normal text-stone-600">°C</span>
          </p>
          <p className="mt-1 text-sm tabular-nums text-stone-600">
            Tavoite <span className="font-semibold text-stone-800">{target.toFixed(1)}</span> °C
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pb-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onSetTarget(clampTemp(target - 0.5))}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-xl font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          aria-label="Laske tavoitetta"
        >
          −
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onSetTarget(clampTemp(target + 0.5))}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-xl font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          aria-label="Nosta tavoitetta"
        >
          +
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-stone-200/80 bg-white/60 px-4 py-3">
        <button
          type="button"
          disabled={pending}
          onClick={onToggleEnabled}
          title={zone.enabled ? "Pysäytä termostaatti" : "Käynnistä termostaatti"}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
            zone.enabled
              ? "bg-orange-100 text-orange-600"
              : "bg-stone-100 text-stone-400"
          }`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path
              d="M12 3c2 4 4 6 4 9a4 4 0 1 1-8 0c0-3 2-5 4-9Z"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className="max-w-[60%] truncate text-center text-xs text-stone-500">
          {sensor?.name ?? "—"}
          {actuator ? ` · ${actuator.on ? "lämmitys päällä" : "lämmitys pois"}` : ""}
        </p>
        <span className="w-10" aria-hidden />
      </div>
    </article>
  );
}
