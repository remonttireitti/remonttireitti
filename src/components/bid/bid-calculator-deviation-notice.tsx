"use client";

import { useMemo } from "react";
import {
  buildDeviationNotice,
  type DeviationNotice,
} from "@/lib/bid-calculator-deviation";

export function BidCalculatorDeviationNotice({
  estimateEuros,
  bidEuros,
  contractorAvgDeviationPercent,
  contractorSampleCount,
}: {
  estimateEuros: number | null | undefined;
  bidEuros: number;
  contractorAvgDeviationPercent?: number | null;
  contractorSampleCount?: number;
}) {
  const notice = useMemo((): DeviationNotice | null => {
    if (!estimateEuros || estimateEuros <= 0) return null;
    return buildDeviationNotice(estimateEuros, bidEuros, {
      contractorAvgDeviationPercent,
      contractorSampleCount,
    });
  }, [
    estimateEuros,
    bidEuros,
    contractorAvgDeviationPercent,
    contractorSampleCount,
  ]);

  if (!notice) return null;

  const styles =
    notice.severity === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : "border-sky-200 bg-sky-50 text-sky-950";

  const icon = notice.severity === "warning" ? "⚠️" : "ℹ️";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">
        {icon} {notice.title}
      </p>
      <p className="mt-1 leading-relaxed">{notice.body}</p>
      <p className="mt-2 text-xs opacity-90">{notice.footer}</p>
    </div>
  );
}
