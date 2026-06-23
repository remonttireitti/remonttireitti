"use client";

import { useCallback, useState } from "react";
import { TrendModal } from "@/components/trend-modal";

export function useMetricTrend() {
  const [metric, setMetric] = useState<string | null>(null);

  const showTrend = useCallback((m: string) => {
    setMetric(m);
  }, []);

  const close = useCallback(() => {
    setMetric(null);
  }, []);

  const modal = metric ? <TrendModal metric={metric} onClose={close} /> : null;

  return { showTrend, modal };
}
