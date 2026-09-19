"use client";

import { useMemo } from "react";
import { FairPriceTierBadge } from "@/components/bid/fair-price-tier-badge";
import {
  assessBidFairPrice,
  buildFairPriceNotice,
  FAIR_PRICE_DISCLAIMER,
  type ContractorTierProfile,
  type JobPriceBenchmark,
} from "@/lib/fair-price-tier";

export function FairPriceTierNotice({
  bidEuros,
  estimateEuros,
  jobBenchmark,
  contractorProfile,
}: {
  bidEuros: number;
  estimateEuros: number | null | undefined;
  jobBenchmark: JobPriceBenchmark | null;
  contractorProfile: ContractorTierProfile | null;
}) {
  const notice = useMemo(() => {
    if (!estimateEuros || estimateEuros <= 0) return null;

    const assessment = assessBidFairPrice({
      bidEuros,
      estimateEuros,
      jobBenchmark,
      contractorProfileAvgDeviation: contractorProfile?.avgDeviationPercent,
      contractorProfileSampleCount: contractorProfile?.sampleCount,
    });

    if (!assessment) return null;

    return buildFairPriceNotice({ assessment, contractorProfile });
  }, [bidEuros, estimateEuros, jobBenchmark, contractorProfile]);

  if (!notice) return null;

  const vsTypical = notice.vsTypicalPercent;
  const absDev = Math.abs(notice.deviationPercent);

  return (
    <div
      className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm text-violet-950"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">Reilu hintataso</span>
        <FairPriceTierBadge
          tier={notice.tier}
          symbols={notice.symbols}
          tierLabel={notice.tierLabel}
          showLabel
        />
      </div>

      <p className="mt-2 leading-relaxed">
        Hintatasosi tässä työssä:{" "}
        <strong>{notice.symbols}</strong> ({notice.tierLabel}).
        {vsTypical != null && Math.abs(vsTypical) >= 5 ? (
          <>
            {" "}
            Tarjouksesi on noin{" "}
            {Math.abs(vsTypical).toLocaleString("fi-FI")} %{" "}
            {vsTypical > 0 ? "korkeampi" : "edullisempi"} kuin vastaavien töiden
            tyypillinen hintataso.
          </>
        ) : absDev >= 5 ? (
          <>
            {" "}
            Tarjouksesi poikkeaa laskennallisesta vertailutasosta noin{" "}
            {absDev.toLocaleString("fi-FI")} %{" "}
            {notice.deviationPercent > 0 ? "ylöspäin" : "alaspäin"}.
          </>
        ) : null}
      </p>

      {notice.showScopeCheck && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-amber-950">
          ⚠️ Tarkista tarjouksen sisältö ennen lähettämistä — laaja tarjous voi
          nostaa hintaa ilman että hintataso kuvaa huonoa tarjousta.
        </p>
      )}

      {notice.profileWarning && (
        <p className="mt-2 text-xs leading-relaxed text-violet-900/90">
          {notice.profileWarning}
        </p>
      )}

      <p className="mt-2 text-xs text-violet-800/80">{FAIR_PRICE_DISCLAIMER}</p>
    </div>
  );
}
