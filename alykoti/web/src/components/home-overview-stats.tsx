"use client";

import { useMetricTrend } from "@/hooks/use-metric-trend";
import { TrendTrigger } from "@/components/trend-trigger";

type Props = {
  hubCount: number;
  onlineCount: number;
  avgCo2: number | null;
};

export function HomeOverviewStats({ hubCount, onlineCount, avgCo2 }: Props) {
  const { showTrend, modal } = useMetricTrend();

  return (
    <>
      {modal}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Keskusyksiköt" value={String(hubCount)} />
        <StatCard label="Online" value={String(onlineCount)} />
        <StatCard
          label="CO₂ keskiarvo"
          value={avgCo2 != null ? `${avgCo2} ppm` : "—"}
          onTrend={avgCo2 != null ? () => showTrend("co2_ppm") : undefined}
        />
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  onTrend,
}: {
  label: string;
  value: string;
  onTrend?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
        {onTrend && <TrendTrigger onClick={onTrend} />}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
