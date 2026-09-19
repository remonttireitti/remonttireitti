"use client";

import Link from "next/link";
import { formatEuro } from "@/lib/calculators/math";
import type { CalculatorProjectSnapshot } from "@/lib/calculator-project-snapshot";
import { suggestedBudgetMaxEuros } from "@/lib/calculator-project-snapshot";
import { calculatorPath } from "@/lib/calculators/registry";
import { VatLabel } from "@/components/price/price-with-vat";
import { CONSUMER_VAT } from "@/lib/vat-label";

export function ProjectCalculatorEstimatePanel({
  snapshot,
  suggestedBudgetMax,
  onApplySuggestedBudget,
}: {
  snapshot: CalculatorProjectSnapshot;
  suggestedBudgetMax?: number | null;
  onApplySuggestedBudget?: () => void;
}) {
  const calcHref = calculatorPath(snapshot.calculatorSlug);
  const budgetHint =
    suggestedBudgetMax != null && suggestedBudgetMax > 0
      ? suggestedBudgetMax
      : suggestedBudgetMaxEuros(snapshot);

  return (
    <aside className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-white to-sky-50/60 px-4 py-4 sm:px-5">
      <p className="text-sm font-semibold text-emerald-950">
        Laskurin hinta-arvio mukana
      </p>
      <p className="mt-2 text-2xl font-bold text-stone-900">
        {formatEuro(snapshot.lowEuros)} – {formatEuro(snapshot.highEuros)}
      </p>
      <p className="mt-1">
        <VatLabel treatment={CONSUMER_VAT} className="text-sm text-stone-600" />
      </p>
      <p className="mt-2 text-sm text-stone-700">
        Todennäköinen taso:{" "}
        <strong>noin {formatEuro(snapshot.totalEuros)}</strong>
        {" · "}
        {snapshot.primaryQty} {snapshot.primaryUnit}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-stone-600">
        Rivihinnat eivät siirry tarjouspyyntöön — urakoitsijat tarjoavat omat
        hintansa. Arvio auttaa sinua ja urakoitsijoita budjetoinnissa.
      </p>
      {budgetHint > 0 && (
        <p className="mt-3 text-sm text-stone-700">
          Ehdotettu budjettikatto:{" "}
          <strong>{formatEuro(budgetHint)}</strong>
          {onApplySuggestedBudget && (
            <>
              {" · "}
              <button
                type="button"
                onClick={onApplySuggestedBudget}
                className="font-medium text-emerald-900 underline hover:no-underline"
              >
                Käytä budjetissa
              </button>
            </>
          )}
        </p>
      )}
      <Link
        href={calcHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-medium text-emerald-900 hover:underline"
      >
        Päivitä arvio laskurissa →
      </Link>
    </aside>
  );
}
