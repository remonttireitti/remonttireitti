"use client";

import { useActionState } from "react";
import {
  reportBidProfitabilityOutcome,
  type BidProfitabilityActionState,
} from "@/app/actions/bid-profitability";
import { formatEuro } from "@/lib/calculators/math";
import { VatLabel } from "@/components/price/price-with-vat";
import { CONTRACTOR_COST_VAT } from "@/lib/vat-label";

export function BidProfitabilityOutcomeForm({
  projectId,
  bidEuros,
  estimatedCostEuros,
}: {
  projectId: string;
  bidEuros: number;
  estimatedCostEuros: number;
}) {
  const [state, action, pending] = useActionState<
    BidProfitabilityActionState,
    FormData
  >(reportBidProfitabilityOutcome, {});

  const estimatedProfit = bidEuros - estimatedCostEuros;

  return (
    <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
      <h2 className="text-lg font-semibold text-emerald-950">
        Ilmoita toteutuneet kulut
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Auta Remonttireittiä oppimaan, kuinka hyvin laskuri ennusti kustannuksia.
        Data on vain aggregoitua oppimista varten.
      </p>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-white/80 px-3 py-2">
          <dt className="text-xs text-stone-500">Tarjous</dt>
          <dd className="font-semibold">{formatEuro(bidEuros)}</dd>
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2">
          <dt className="text-xs text-stone-500">Arvioidut kulut</dt>
          <dd className="font-semibold">{formatEuro(estimatedCostEuros)}</dd>
        </div>
        <div className="rounded-lg bg-white/80 px-3 py-2">
          <dt className="text-xs text-stone-500">Arvioitu kate</dt>
          <dd className="font-semibold">{formatEuro(estimatedProfit)}</dd>
        </div>
      </dl>

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="bid_euros" value={bidEuros} />
        <input
          type="hidden"
          name="estimated_cost_euros"
          value={estimatedCostEuros}
        />

        <label className="block text-sm">
          <span className="font-medium text-stone-800">
            Toteutuneet kulut yhteensä (€)
          </span>
          <input
            name="actual_cost_euros"
            type="number"
            min={0}
            step={100}
            required
            className="mt-1 w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2"
            placeholder={String(Math.round(estimatedCostEuros))}
          />
          <VatLabel treatment={CONTRACTOR_COST_VAT} className="mt-1" />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-stone-800">
            Lyhyt huomio (valinnainen)
          </span>
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            placeholder="Esim. materiaalit nousivat, työaika pidempi kuin arvio"
          />
        </label>

        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-emerald-800" role="status">
            {state.success}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? "Tallennetaan…" : "Tallenna toteuma"}
        </button>
      </form>
    </section>
  );
}
