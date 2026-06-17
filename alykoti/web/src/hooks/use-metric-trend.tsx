"use client";

import { useCallback, useState } from "react";
import type { MetricHistory } from "@/lib/metric-samples";
import { TrendModal } from "@/components/trend-modal";

export function useMetricTrend() {
  const [history, setHistory] = useState<MetricHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const showTrend = useCallback(async (metric: string) => {
    setOpen(true);
    setLoading(true);
    setHistory(null);
    try {
      const res = await fetch(`/api/device/history?metric=${encodeURIComponent(metric)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        setHistory(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setHistory(null);
  }, []);

  const modal = open ? (
    <TrendModal history={history} loading={loading} onClose={close} />
  ) : null;

  return { showTrend, modal };
}
