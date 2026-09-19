"use client";

import {
  deleteContractorQuote,
  type DeleteContractorQuoteActionState,
} from "@/app/actions/contractor-quotes";
import { useServerActionSubmit } from "@/hooks/use-server-action-submit";

export function DeleteContractorQuoteButton({
  quoteId,
  title,
  className = "",
}: {
  quoteId: string;
  title: string;
  className?: string;
}) {
  const { state, submit, pending } =
    useServerActionSubmit<DeleteContractorQuoteActionState>(
      deleteContractorQuote,
    );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (
      !confirm(
        `Poistetaanko "${title}" pysyvästi?\n\nTarjous poistuu kokonaan eikä sitä voi palauttaa.\nKuukauden tallennuskiintiö ei palaudu — uuden tarjouksen tallennus kuluttaa silti kiintiötä.`,
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`.trim()}>
      <form action={submit} onSubmit={handleSubmit} className="inline-flex">
        <input type="hidden" name="quote_id" value={quoteId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-red-200 bg-white px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "Poistetaan…" : "Poista pysyvästi"}
        </button>
      </form>
      {state.error && (
        <p className="max-w-xs text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
