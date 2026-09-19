"use client";

import { useMemo } from "react";
import { FairPriceTierBadge } from "@/components/bid/fair-price-tier-badge";
import { VatLabel } from "@/components/price/price-with-vat";
import { formatEuro } from "@/lib/calculators/math";
import {
  buildProfitabilityMarketInsight,
  computeProfitability,
  type BidCostBreakdown,
} from "@/lib/bid-profitability";
import { CONTRACTOR_COST_VAT } from "@/lib/vat-label";
import type { JobPriceBenchmark } from "@/lib/fair-price-tier";

const COST_FIELDS: {
  key: keyof BidCostBreakdown;
  label: string;
  hint?: string;
}[] = [
  { key: "materials", label: "Materiaalit" },
  { key: "labor", label: "Työ" },
  { key: "subcontracting", label: "Alihankinta" },
  { key: "travelEquipment", label: "Matkat / kalusto / muut kulut" },
  { key: "otherDirect", label: "Muut välittömät kulut" },
];

type Props = {
  sellingPrice: number;
  onSellingPriceChange: (value: number) => void;
  costs: BidCostBreakdown;
  costFields: Record<keyof BidCostBreakdown, string>;
  onCostFieldChange: (key: keyof BidCostBreakdown, raw: string) => void;
  hourlyRate: number;
  calculatorEstimateEuros: number;
  jobBenchmark: JobPriceBenchmark | null;
};

export function BidProfitabilityPanel({
  sellingPrice,
  onSellingPriceChange,
  costs,
  costFields,
  onCostFieldChange,
  hourlyRate,
  calculatorEstimateEuros,
  jobBenchmark,
}: Props) {
  const insight = useMemo(
    () =>
      buildProfitabilityMarketInsight({
        sellingPrice,
        costs,
        calculatorEstimateEuros,
        hourlyRate,
        jobBenchmark,
      }),
    [sellingPrice, costs, calculatorEstimateEuros, hourlyRate, jobBenchmark],
  );

  const profitability =
    insight?.profitability ??
    computeProfitability(sellingPrice, costs, hourlyRate);

  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
          Kannattavuus
        </p>
        <p className="mt-1 text-sm text-stone-600">
          Näe mitä urakasta jää käteen — Remonttireitti ei laske vain
          myyntihintaa vaan auttaa arvioimaan katetta.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-stone-800">Myyntihinta (tarjous)</span>
          <input
            type="number"
            min={0}
            step={100}
            value={sellingPrice || ""}
            onChange={(e) =>
              onSellingPriceChange(Number(e.target.value) || 0)
            }
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 tabular-nums"
          />
          <VatLabel treatment={CONTRACTOR_COST_VAT} className="mt-1 text-xs" />
        </label>

        {COST_FIELDS.map(({ key, label, hint }) => (
          <label key={key} className="block text-sm">
            <span className="font-medium text-stone-700">{label}</span>
            {hint && (
              <span className="ml-1 text-xs text-stone-500">({hint})</span>
            )}
            <input
              type="number"
              min={0}
              step={50}
              value={costFields[key]}
              onChange={(e) => onCostFieldChange(key, e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 tabular-nums"
              placeholder="0"
            />
          </label>
        ))}
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-stone-100">
          <dt className="text-xs font-medium uppercase text-stone-500">
            Tarjous
          </dt>
          <dd className="mt-1 text-lg font-bold text-stone-900">
            {formatEuro(profitability.sellingPrice)}
          </dd>
        </div>
        <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-stone-100">
          <dt className="text-xs font-medium uppercase text-stone-500">
            Arvioidut kustannukset
          </dt>
          <dd className="mt-1 text-lg font-bold text-stone-900">
            {formatEuro(profitability.totalCosts)}
          </dd>
        </div>
        <div className="rounded-xl bg-emerald-100/80 px-4 py-3 ring-1 ring-emerald-200">
          <dt className="text-xs font-medium uppercase text-emerald-800">
            Arvioitu kate
          </dt>
          <dd className="mt-1 text-lg font-bold text-emerald-950">
            {formatEuro(profitability.profit)}
          </dd>
        </div>
        <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-stone-100">
          <dt className="text-xs font-medium uppercase text-stone-500">
            Kateprosentti
          </dt>
          <dd className="mt-1 text-lg font-bold text-stone-900">
            {profitability.profitMarginPercent.toLocaleString("fi-FI")} %
          </dd>
        </div>
        {profitability.estimatedHours != null && (
          <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-stone-100">
            <dt className="text-xs font-medium uppercase text-stone-500">
              Arvioitu työaika
            </dt>
            <dd className="mt-1 text-lg font-bold text-stone-900">
              {profitability.estimatedHours.toLocaleString("fi-FI")} h
            </dd>
          </div>
        )}
        {profitability.profitPerHour != null && (
          <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-emerald-100">
            <dt className="text-xs font-medium uppercase text-emerald-800">
              Kate / työtunti
            </dt>
            <dd className="mt-1 text-lg font-bold text-emerald-950">
              {profitability.profitPerHour.toLocaleString("fi-FI")} €/h
            </dd>
          </div>
        )}
      </dl>

      {insight && (
        <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3 text-sm text-violet-950">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">Reilu hintataso</span>
            <FairPriceTierBadge
              tier={insight.tier}
              symbols={insight.symbols}
              tierLabel={insight.tierLabel}
              showLabel
            />
          </div>
          {insight.typicalRange && (
            <p className="mt-2 text-violet-900/90">
              Vastaavien töiden tyypillinen tarjoushinta:{" "}
              <strong>{insight.typicalRange.label}</strong>
            </p>
          )}
          {insight.advisory && (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-emerald-950">
              {insight.advisory}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
