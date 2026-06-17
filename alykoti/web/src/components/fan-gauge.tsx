"use client";

import { MIN_FAN_PCT } from "@/lib/ventilation-logic";

type Props = {
  label: string;
  value: number | null | undefined;
  target?: number | null;
  onTrend?: () => void;
};

export function FanGauge({ label, value, target, onTrend }: Props) {
  const pct = value != null && Number.isFinite(value) ? Math.round(value) : null;
  const width = pct != null ? ((pct - MIN_FAN_PCT) / (100 - MIN_FAN_PCT)) * 100 : 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <button
          type="button"
          onClick={onTrend}
          className="text-left text-sm font-semibold text-stone-800 hover:underline"
        >
          {label}
        </button>
        <div className="text-right">
          <span className="text-2xl font-bold tabular-nums text-stone-900">
            {pct != null ? pct : "—"}
          </span>
          <span className="ml-0.5 text-sm text-stone-500">%</span>
          <p className="text-xs text-stone-500">laite nyt</p>
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-700 transition-all duration-700"
          style={{ width: `${Math.max(0, Math.min(100, width))}%` }}
        />
      </div>
      {target != null && (
        <p className="mt-2 text-xs text-stone-500">
          Tavoite: <span className="font-semibold text-stone-700">{Math.round(target)} %</span>
        </p>
      )}
    </div>
  );
}

type SliderProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
};

export function FanTargetSlider({ label, value, onChange }: SliderProps) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="tabular-nums font-semibold text-stone-900">{value} %</span>
      </div>
      <input
        type="range"
        min={MIN_FAN_PCT}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-900"
      />
    </label>
  );
}
