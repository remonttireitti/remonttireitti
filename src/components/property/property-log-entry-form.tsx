"use client";

import { useActionState } from "react";
import {
  createLogEntry,
  type PropertyActionState,
} from "@/app/actions/property-log";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function PropertyLogEntryForm({ propertyId }: { propertyId: string }) {
  const [state, action, pending] = useActionState<
    PropertyActionState,
    FormData
  >(createLogEntry, {});

  return (
    <form
      action={action}
      className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5"
    >
      <input type="hidden" name="property_id" value={propertyId} />
      <h3 className="text-sm font-semibold text-stone-900">
        Lisää aiempi tai ulkopuolinen työ
      </h3>
      <p className="mt-1 text-xs text-stone-600">
        Kirjaa remontit ja huollot, jotka eivät tule Remonttireitin urakan kautta.
      </p>

      <label className="mt-4 block text-xs font-medium text-stone-700">
        Työn otsikko *
      </label>
      <input
        name="title"
        required
        minLength={3}
        className={inputClass}
        placeholder="Esim. Kylpyhuoneremontti 2022"
      />

      <label className="mt-3 block text-xs font-medium text-stone-700">
        Suorituspäivä *
      </label>
      <input name="performed_at" type="date" required className={inputClass} />

      <label className="mt-3 block text-xs font-medium text-stone-700">
        Urakoitsija (valinnainen)
      </label>
      <input
        name="contractor_name"
        className={inputClass}
        placeholder="Yrityksen nimi"
      />

      <label className="mt-3 block text-xs font-medium text-stone-700">
        Hinta € (valinnainen)
      </label>
      <input
        name="amount_euros"
        type="number"
        min={1}
        step={1}
        className={inputClass}
        placeholder="15000"
      />

      <label className="mt-3 block text-xs font-medium text-stone-700">
        Kuvaus (valinnainen)
      </label>
      <textarea
        name="description"
        rows={3}
        className={inputClass}
        placeholder="Mitä tehtiin, materiaalit, huomiot…"
      />

      {state.error && (
        <p className="mt-3 text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-3 text-xs text-sky-800" role="status">
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Lisää merkintä"}
      </button>
    </form>
  );
}
