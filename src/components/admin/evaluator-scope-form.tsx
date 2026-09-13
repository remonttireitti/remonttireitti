"use client";

import { useActionState } from "react";
import {
  setEvaluatorScopes,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import { EVALUATOR_SCOPE_AREAS } from "@/lib/evaluator-scopes";

export function EvaluatorScopeForm({
  userId,
  scopes,
}: {
  userId: string;
  scopes: string[];
}) {
  const [state, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(setEvaluatorScopes, {});

  const normalizedScopes = scopes.map((s) => (s === "heat_pump" ? "lammitys" : s));

  return (
    <form
      action={action}
      className="mt-2 space-y-3 border-t border-stone-100 pt-3"
    >
      <input type="hidden" name="user_id" value={userId} />
      <div>
        <p className="text-xs font-medium text-stone-800">Arvioijaoikeudet</p>
        <p className="mt-0.5 text-xs text-stone-500">
          Valitse alueet, joiden tarjouspyyntöjä arvioija voi käsitellä (sama jako
          kuin tarjouspyynnöissä).
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {EVALUATOR_SCOPE_AREAS.map((area) => (
          <label
            key={area.slug}
            className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 bg-stone-50/80 px-2.5 py-2 text-xs text-stone-800"
          >
            <input
              type="checkbox"
              name={`scope_${area.slug}`}
              defaultChecked={normalizedScopes.includes(area.slug)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{area.title}</span>
              <span className="mt-0.5 block text-stone-500">{area.description}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Tallenna arvioijaoikeudet
        </button>
        {state.ok && <span className="text-xs text-sky-700">{state.ok}</span>}
        {state.error && (
          <span className="text-xs text-red-600" role="alert">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
