"use client";

import { useActionState } from "react";
import {
  addEvaluationItem,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function EvaluationItemForm({
  requestId,
  bidId,
  defaultLabel,
  defaultAmountEuros,
  defaultDeviceBrand,
}: {
  requestId: string;
  bidId?: string;
  defaultLabel?: string;
  defaultAmountEuros?: number;
  defaultDeviceBrand?: string;
}) {
  const [state, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(addEvaluationItem, {});

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="rounded-xl border border-stone-200 bg-stone-50/80 p-4"
    >
      <input type="hidden" name="request_id" value={requestId} />
      {bidId && <input type="hidden" name="bid_id" value={bidId} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-stone-700">
          Tunniste *
          <input
            name="label"
            required
            defaultValue={defaultLabel ?? ""}
            className={inputClass}
            placeholder="Tarjous A / Mitsubishi"
          />
        </label>
        <label className="block text-xs font-medium text-stone-700">
          Hinta € (sis. ALV)
          <input
            name="amount_euros"
            type="number"
            min={1}
            step={1}
            defaultValue={defaultAmountEuros ?? ""}
            className={inputClass}
            placeholder="2490"
          />
        </label>
        <label className="block text-xs font-medium text-stone-700 sm:col-span-2">
          Laite / merkki
          <input
            name="device_brand"
            defaultValue={defaultDeviceBrand ?? ""}
            className={inputClass}
            placeholder="Mitsubishi, Panasonic…"
          />
        </label>
        {!bidId && (
          <label className="block text-xs font-medium text-stone-700 sm:col-span-2">
            Tarjous PDF tai kuva *
            <input
              name="bid_files"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              multiple
              className="mt-1 block w-full text-sm"
            />
          </label>
        )}
        <label className="block text-xs font-medium text-stone-700 sm:col-span-2">
          Lisätiedot
          <textarea name="notes" rows={2} className={inputClass} />
        </label>
      </div>

      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      {state.ok && <p className="mt-2 text-xs text-sky-800">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
      >
        {pending ? "Lisätään…" : "Lisää tarjous"}
      </button>
    </form>
  );
}
