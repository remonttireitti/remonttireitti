"use client";

import { useActionState } from "react";
import {
  setBidEvaluationSettings,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import type { BidEvaluationSettings } from "@/lib/bid-evaluation";

const inputClass =
  "mt-1 w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-sm";

export function BidEvaluationSettingsForm({
  settings,
}: {
  settings: BidEvaluationSettings;
}) {
  const [state, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(setBidEvaluationSettings, {});

  const defaultEuros =
    settings.price_per_bid_cents != null
      ? String(Math.round(settings.price_per_bid_cents / 100))
      : "";

  return (
    <form action={action} className="rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-stone-900">Hinnoittelu</h2>
      <p className="mt-2 text-sm text-stone-600">
        Aloita ilmaisena. Jos arviointi ulkoistetaan, voit veloittaa hinnan per
        arvioitava tarjous. Maksujärjestelmää ei vielä ole — hinta näkyy asiakkaalle
        tiedoksi.
      </p>

      <fieldset className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="pricing_mode"
            value="free"
            defaultChecked={settings.pricing_mode === "free"}
          />
          Ilmainen (0 €)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="pricing_mode"
            value="paid_per_bid"
            defaultChecked={settings.pricing_mode === "paid_per_bid"}
          />
          Maksullinen — hinta per tarjous
        </label>
      </fieldset>

      <label className="mt-4 block text-sm font-medium text-stone-800">
        Hinta € / tarjous (sis. ALV)
        <input
          name="price_per_bid_euros"
          type="number"
          min={1}
          step={1}
          defaultValue={defaultEuros}
          className={inputClass}
          placeholder="29"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Tallenna hinnoittelu"}
      </button>

      {state.ok && <p className="mt-2 text-sm text-sky-800">{state.ok}</p>}
      {state.error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
