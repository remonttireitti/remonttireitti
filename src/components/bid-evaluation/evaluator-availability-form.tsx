"use client";

import { useActionState } from "react";
import {
  setEvaluatorAvailability,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import type { EvaluatorProfile } from "@/lib/bid-evaluation";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm";

export function EvaluatorAvailabilityForm({
  profile,
}: {
  profile: EvaluatorProfile;
}) {
  const [state, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(setEvaluatorAvailability, {});

  return (
    <form action={action} className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold text-stone-900">Saatavuus</h2>
      <p className="mt-1 text-sm text-stone-600">
        Merkitse, jos et tällä hetkellä ole sopiva arvioija uusille pyynnöille.
        Käynnissä olevat arviot voit silti viimeistellä.
      </p>

      <label className="mt-4 flex items-start gap-2 text-sm text-stone-800">
        <input
          type="checkbox"
          name="accepting_reviews"
          defaultChecked={profile.accepting_reviews}
          className="mt-1"
        />
        <span>Otan vastaan uusia arviointipyyntöjä</span>
      </label>

      <label className="mt-3 block text-sm text-stone-700">
        Syy poissaoloon (näkyy vain adminille ja sinulle)
        <textarea
          name="unavailable_note"
          rows={2}
          defaultValue={profile.unavailable_note ?? ""}
          className={inputClass}
          placeholder="Esim. loma viikolla 42, keskityn muihin projekteihin…"
        />
      </label>

      {profile.unavailable_set_by === "admin" && !profile.accepting_reviews && (
        <p className="mt-2 text-xs text-amber-800">
          Admin on merkinnyt sinut toistaiseksi poissaolevaksi.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Tallenna saatavuus"}
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
