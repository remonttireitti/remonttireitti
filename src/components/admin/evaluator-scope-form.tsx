"use client";

import { useActionState } from "react";
import {
  setEvaluatorScopes,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";

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

  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-2">
      <input type="hidden" name="user_id" value={userId} />
      <label className="flex items-center gap-1.5 text-xs text-stone-700">
        <input
          type="checkbox"
          name="scope_heat_pump"
          defaultChecked={scopes.includes("heat_pump")}
        />
        Lämpöpumput
      </label>
      <label className="flex items-center gap-1.5 text-xs text-stone-700">
        <input
          type="checkbox"
          name="scope_general"
          defaultChecked={scopes.includes("general")}
        />
        Yleinen remontti
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-emerald-700 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        Tallenna arvioijaoikeudet
      </button>
      {state.ok && <span className="text-xs text-sky-700">{state.ok}</span>}
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
