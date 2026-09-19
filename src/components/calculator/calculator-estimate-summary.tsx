"use client";

import Link from "next/link";
import { brand } from "@/lib/brand-theme";
import { saveCalculatorProjectSnapshot } from "@/lib/calculator-project-snapshot";
import { formatEuro } from "@/lib/calculators/math";
import { VatLabel } from "@/components/price/price-with-vat";
import { CONSUMER_VAT } from "@/lib/vat-label";
import type { CalculatorConfig, PriceFactorStatus } from "@/lib/calculators/types";
import { MAINTENANCE_JOB_SLUGS } from "@/constants/maintenance";

function ctaHref(jobSlug: string): string {
  if ((MAINTENANCE_JOB_SLUGS as readonly string[]).includes(jobSlug)) {
    return `/huolto/uusi?tyyppi=${jobSlug}`;
  }
  return `/remontti/uusi?tyyppi=${jobSlug}`;
}

function FactorIcon({ status }: { status: PriceFactorStatus }) {
  if (status === "included") {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
        ✓
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-700">
      ⚠
    </span>
  );
}

type Props = {
  config: CalculatorConfig;
  total: number;
  low: number;
  high: number;
  perUnitMid?: number;
  primaryQty: number;
  detailMode: boolean;
  unansweredDetailQuestionIds: string[];
};

export function CalculatorEstimateSummary({
  config,
  total,
  low,
  high,
  perUnitMid,
  primaryQty,
  detailMode,
  unansweredDetailQuestionIds,
}: Props) {
  const cta = config.ctaLabel ?? "Pyydä tarjoukset ilmaiseksi";
  const unit = config.primaryInput.unit;

  function persistSnapshotForRequest() {
    saveCalculatorProjectSnapshot({
      calculatorSlug: config.slug,
      jobSlug: config.jobSlug,
      calculatorTitle: config.title,
      primaryQty,
      primaryUnit: unit,
      totalEuros: total,
      lowEuros: low,
      highEuros: high,
    });
  }

  const factors =
    config.priceFactors?.map((factor) => {
      const isVariable =
        factor.status === "variable" &&
        factor.questionIds?.some((id) => unansweredDetailQuestionIds.includes(id));
      return {
        ...factor,
        status: isVariable ? ("variable" as const) : factor.status,
      };
    }) ?? [];

  return (
    <aside className="rounded-2xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 via-white to-sky-50 p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-orange-800">
        Arvioitu kustannus
      </p>
      <p className="mt-1 text-3xl font-bold text-stone-900">
        {formatEuro(low)} – {formatEuro(high)}
      </p>
      <p className="mt-1">
        <VatLabel treatment={CONSUMER_VAT} className="text-sm text-stone-600" />
      </p>
      <p className="mt-2 text-base text-stone-700">
        Todennäköinen taso: <strong>noin {formatEuro(total)}</strong>
        {perUnitMid != null && unit === "m²" && (
          <span className="text-stone-600">
            {" "}
            ({formatEuro(perUnitMid)}/{unit})
          </span>
        )}
      </p>
      <p className="mt-1 text-sm text-stone-600">
        {primaryQty} {unit} · ennen kotitalousvähennystä · suuntaa-antava arvio
      </p>

      {factors.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-stone-800">
            Mikä nostaa tai laskee hintaa?
          </h3>
          <ul className="mt-3 space-y-2">
            {factors.map((factor) => (
              <li key={factor.label} className="flex items-start gap-2 text-sm text-stone-700">
                <FactorIcon status={factor.status} />
                <span>
                  {factor.label}
                  {factor.status === "variable" && !detailMode && (
                    <span className="ml-1 text-xs text-amber-700">
                      (tarkenna vastauksilla)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mt-6 text-lg font-bold text-stone-900">
        Haluatko nähdä, mitä urakoitsijat oikeasti tarjoavat juuri sinun kohteellesi?
      </h2>
      <div className={`${brand.actionsStack} mt-4`}>
        <Link
          href={ctaHref(config.jobSlug)}
          onClick={persistSnapshotForRequest}
          className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
        >
          {cta}
        </Link>
        <Link
          href={`/hinta-arkisto?tyo=${config.priceArchiveParam ?? config.jobSlug}`}
          className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}
        >
          Katso toteutuneet hinnat
        </Link>
      </div>
    </aside>
  );
}
