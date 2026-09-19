"use client";

import { useMemo } from "react";
import { FairPriceTierBadge } from "@/components/bid/fair-price-tier-badge";
import {
  assessBidFairPrice,
  buildFairPriceNotice,
  FAIR_PRICE_DISCLAIMER,
  FAIR_PRICE_PROFILE_BUILDING_NOTE,
  PRICE_TIER_PROFILE_MIN_SAMPLES,
  type ContractorTierProfile,
  type JobPriceBenchmark,
} from "@/lib/fair-price-tier";
import {
  buildProfitabilityAdvisory,
  typicalBidRangeFromBenchmark,
  type BidProfitabilitySummary,
} from "@/lib/bid-profitability";

export function FairPriceTierNotice({
  bidEuros,
  estimateEuros,
  jobBenchmark,
  contractorProfile,
  profitability,
}: {
  bidEuros: number;
  estimateEuros: number | null | undefined;
  jobBenchmark: JobPriceBenchmark | null;
  contractorProfile: ContractorTierProfile | null;
  profitability?: BidProfitabilitySummary | null;
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
  const typicalRange = typicalBidRangeFromBenchmark(
    estimateEuros ?? 0,
    jobBenchmark,
  );
  const profitAdvisory =
    profitability &&
    buildProfitabilityAdvisory({
      tier: notice.tier,
      profitMarginPercent: profitability.profitMarginPercent,
      profitEuros: profitability.profit,
    });

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

      {typicalRange && (
        <p className="mt-2 text-violet-900/90">
          Vastaavien töiden tyypillinen tarjoushinta:{" "}
          <strong>{typicalRange.label}</strong>
        </p>
      )}

      {profitability && (
        <dl className="mt-3 grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-emerald-800">Arvioitu kate</dt>
            <dd className="font-semibold text-emerald-950">
              {profitability.profit.toLocaleString("fi-FI")} € (
              {profitability.profitMarginPercent.toLocaleString("fi-FI")} %)
            </dd>
          </div>
          {profitability.estimatedHours != null && (
            <div>
              <dt className="text-emerald-800">Työaika</dt>
              <dd className="font-semibold text-emerald-950">
                {profitability.estimatedHours.toLocaleString("fi-FI")} h
              </dd>
            </div>
          )}
          {profitability.profitPerHour != null && (
            <div>
              <dt className="text-emerald-800">Kate / h</dt>
              <dd className="font-semibold text-emerald-950">
                {profitability.profitPerHour.toLocaleString("fi-FI")} €/h
              </dd>
            </div>
          )}
        </dl>
      )}

      {profitAdvisory && (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-emerald-950">
          {profitAdvisory}
        </p>
      )}

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

      {contractorProfile &&
        !contractorProfile.isReliable &&
        contractorProfile.sampleCount > 0 && (
          <p className="mt-2 rounded-lg border border-stone-200 bg-white/70 px-3 py-2 text-xs leading-relaxed text-stone-700">
            {FAIR_PRICE_PROFILE_BUILDING_NOTE(
              contractorProfile.sampleCount,
              PRICE_TIER_PROFILE_MIN_SAMPLES,
            )}{" "}
            Asiakkaat näkevät yrityksesi hintaluokan vasta riittävän datan
            jälkeen — realistiset tarjoukset rakentavat luotettavan profiilin.
          </p>
        )}

      <p className="mt-2 text-xs text-violet-800/80">{FAIR_PRICE_DISCLAIMER}</p>
    </div>
  );
}
