"use client";

import { useActionState } from "react";
import {
  setEvaluatorAvailabilityAdmin,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import type { EvaluatorProfile } from "@/lib/bid-evaluation";

export function EvaluatorAvailabilityAdminForm({
  userId,
  profile,
  hasScopes,
}: {
  userId: string;
  profile: EvaluatorProfile | null;
  hasScopes: boolean;
}) {
  const [state, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(setEvaluatorAvailabilityAdmin, {});

  if (!hasScopes) return null;

  const accepting = profile?.accepting_reviews ?? true;

  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-3 border-t border-stone-100 pt-2">
      <input type="hidden" name="user_id" value={userId} />
      <label className="flex items-center gap-1.5 text-xs text-stone-700">
        <input
          type="checkbox"
          name="accepting_reviews"
          defaultChecked={accepting}
        />
        Ottaa arviointeja
      </label>
      <label className="min-w-[12rem] flex-1 text-xs text-stone-700">
        Poissaolon syy
        <input
          name="unavailable_note"
          defaultValue={profile?.unavailable_note ?? ""}
          className="mt-0.5 w-full rounded border border-stone-300 px-2 py-1"
          placeholder="Esim. ei tällä hetkellä sopiva"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-stone-700 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        Tallenna saatavuus
      </button>
      {state.ok && <span className="text-xs text-sky-700">{state.ok}</span>}
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
