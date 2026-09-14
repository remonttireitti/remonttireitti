"use client";

import { useActionState } from "react";
import {
  submitEvaluationReview,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import {
  BID_EVALUATION_DIMENSIONS,
  BID_EVALUATION_VERDICT_LABELS,
} from "@/lib/bid-evaluation";
import type { BidEvaluationItemRow } from "@/lib/bid-evaluation-server";
import { brand } from "@/lib/brand-theme";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm";

export function EvaluationReviewForm({
  requestId,
  items,
}: {
  requestId: string;
  items: BidEvaluationItemRow[];
}) {
  const [state, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(submitEvaluationReview, {});

  useActionRedirect(state);

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="request_id" value={requestId} />

      {items.map((item) => (
        <section
          key={item.id}
          className="rounded-2xl border border-stone-200 bg-white p-5"
        >
          <h3 className="font-semibold text-stone-900">{item.label}</h3>
          {item.device_brand && (
            <p className="text-sm text-stone-600">Laite: {item.device_brand}</p>
          )}

          <div className="mt-4 space-y-4">
            {BID_EVALUATION_DIMENSIONS.map((dim) => (
              <div key={dim.id} className="rounded-lg bg-stone-50 p-3">
                <p className="text-sm font-medium text-stone-900">{dim.label}</p>
                <p className="text-xs text-stone-500">{dim.hint}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <label className="text-xs text-stone-600">
                    Pisteet 1–5
                    <select
                      name={`score_${item.id}_${dim.id}`}
                      className={inputClass}
                      defaultValue=""
                    >
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  {dim.id === "overall" && (
                    <label className="text-xs text-stone-600 sm:col-span-2">
                      Kokonaisluokka *
                      <select
                        name={`verdict_${item.id}_${dim.id}`}
                        required
                        className={inputClass}
                        defaultValue=""
                      >
                        <option value="">Valitse</option>
                        {Object.entries(BID_EVALUATION_VERDICT_LABELS).map(
                          ([value, { label }]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                </div>
                <label className="mt-2 block text-xs text-stone-600">
                  Huomio asiakkaalle
                  <textarea
                    name={`note_${item.id}_${dim.id}`}
                    rows={2}
                    className={inputClass}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className={`${brand.section} p-5`}>
        <label className="block text-sm font-medium text-stone-900">
          Yhteenveto asiakkaalle *
          <textarea
            name="summary"
            required
            minLength={20}
            rows={5}
            className={inputClass}
            placeholder="Kerro mitä tarjouksissa on hyvää, mitä puuttuu ja mitä kannattaa kysyä urakoitsijalta — älä suosittele tiettyä tekijää."
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-stone-900">
          Kysymyksiä urakoitsijoille (valinnainen)
          <textarea
            name="questions_for_contractor"
            rows={3}
            className={inputClass}
            placeholder="Esim. sisältyykö kondenssiveden poisto?"
          />
        </label>
      </section>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${brand.btnPrimary} disabled:opacity-60`}
      >
        {pending ? "Julkaistaan…" : "Julkaise arvio asiakkaalle"}
      </button>
    </form>
  );
}
