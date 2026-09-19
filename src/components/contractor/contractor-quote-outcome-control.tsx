"use client";

import { useActionState } from "react";
import {
  updateContractorQuoteOutcome,
  type ContractorQuoteOutcomeState,
} from "@/app/actions/contractor-quote-outcome";
import {
  CONTRACTOR_QUOTE_OUTCOME_LABELS,
  type ContractorQuoteOutcome,
} from "@/lib/contractor-quote-types";
import type { ContractorQuoteListItem } from "@/lib/contractor-quote-stats";

function outcomeBadgeClass(outcome: ContractorQuoteOutcome): string {
  if (outcome === "won") {
    return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  }
  if (outcome === "lost") {
    return "bg-stone-100 text-stone-700 ring-stone-200";
  }
  return "bg-amber-50 text-amber-900 ring-amber-200";
}

export function ContractorQuoteOutcomeControl({
  quote,
}: {
  quote: ContractorQuoteListItem;
}) {
  const [state, action, pending] = useActionState<
    ContractorQuoteOutcomeState,
    FormData
  >(updateContractorQuoteOutcome, {});

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="quote_id" value={quote.id} />
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${outcomeBadgeClass(quote.outcome)}`}
      >
        {CONTRACTOR_QUOTE_OUTCOME_LABELS[quote.outcome]}
      </span>
      {quote.remonttireitti_project_id && (
        <span className="text-xs text-sky-700">Remonttireitti</span>
      )}
      <select
        name="outcome"
        defaultValue={quote.outcome}
        disabled={pending}
        className="rounded-lg border border-stone-200 px-2 py-1 text-xs"
        aria-label="Tilauskuittaus"
      >
        <option value="pending">Odottaa</option>
        <option value="won">Tilattu</option>
        <option value="lost">Ei tullut</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-stone-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? "…" : "Tallenna"}
      </button>
      {state.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
