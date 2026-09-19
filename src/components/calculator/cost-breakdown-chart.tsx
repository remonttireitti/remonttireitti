"use client";

import { formatEuro } from "@/lib/calculators/math";

type Segment = {
  label: string;
  amount: number;
  color: string;
};

export function CostBreakdownChart({
  segments,
  title = "Kustannusjako",
  subtitle,
}: {
  segments: Segment[];
  title?: string;
  subtitle?: string;
}) {
  const active = segments.filter((s) => s.amount > 0);
  const total = active.reduce((sum, s) => sum + s.amount, 0);
  if (total === 0) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      {subtitle && (
        <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
      )}

      <div className="mt-4 flex h-8 w-full overflow-hidden rounded-xl">
        {active.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all duration-300`}
            style={{ width: `${(s.amount / total) * 100}%` }}
            title={`${s.label}: ${formatEuro(s.amount)}`}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {active.map((s) => {
          const pct = Math.round((s.amount / total) * 100);
          return (
            <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-stone-700">
                <span className={`inline-block h-3 w-3 shrink-0 rounded-sm ${s.color}`} />
                {s.label}
              </span>
              <span className="shrink-0 font-medium text-stone-900">
                {formatEuro(s.amount)}{" "}
                <span className="text-stone-500">({pct} %)</span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-stone-100 pt-3 text-right text-base font-bold text-stone-900">
        Yhteensä {formatEuro(total)}
      </p>
    </div>
  );
}
