"use client";

import { TrendTrigger } from "@/components/trend-trigger";
import type { ResolvedDeviceReading } from "@/lib/device-reading-metrics";

type Props = {
  readings: ResolvedDeviceReading[];
  onShowTrend: (metric: string) => void;
  className?: string;
};

/** Tiivis lukemalista listanäkymissä — jokainen arvo avaa trendin. */
export function DeviceReadingsInline({ readings, onShowTrend, className = "mt-2" }: Props) {
  if (readings.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
      {readings.map((row) => (
        <span key={row.metric} className="inline-flex items-center gap-0.5 rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-stone-200">
          <button
            type="button"
            onClick={() => onShowTrend(row.metric)}
            className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-600"
            title="Näytä trendi"
          >
            {row.label}: {row.value}
          </button>
          <TrendTrigger onClick={() => onShowTrend(row.metric)} className="!p-0.5" />
        </span>
      ))}
    </div>
  );
}
