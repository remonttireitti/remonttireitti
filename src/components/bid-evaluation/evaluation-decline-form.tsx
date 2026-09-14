"use client";

import { useActionState } from "react";
import {
  releaseEvaluationRequest,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import { useActionRedirect } from "@/hooks/use-action-redirect";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm";

export function EvaluationDeclineForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(releaseEvaluationRequest, {});

  useActionRedirect(state);

  return (
    <form
      action={action}
      className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5"
    >
      <input type="hidden" name="request_id" value={requestId} />
      <h2 className="font-semibold text-amber-950">En ole sopiva tälle pyynnölle</h2>
      <p className="mt-1 text-sm text-amber-900">
        Palauta pyyntö jonoon toiselle arvioijalle. Kerro lyhyesti syy — esim. erikoistun
        vain ilmalämpöpumppuihin tai pyyntö vaatii paikan päällä käynnin.
      </p>
      <label className="mt-3 block text-sm text-amber-950">
        Syy *
        <textarea
          name="reason"
          required
          rows={3}
          className={inputClass}
          placeholder="Esim. en arvioi maalämpöpumppuja tai tarjoukset vaativat paikan päällä tarkistuksen"
        />
      </label>
      {state.error && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-50 disabled:opacity-60"
      >
        {pending ? "Palautetaan…" : "Palauta jonoon"}
      </button>
    </form>
  );
}
