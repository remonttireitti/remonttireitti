"use client";

import { useActionState } from "react";
import { offerHelp, type HelpActionState } from "@/app/actions/help-requests";
import { brand } from "@/lib/brand-theme";

export function HelpOfferForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<HelpActionState, FormData>(
    offerHelp,
    {},
  );

  return (
    <form action={action} className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
      <h3 className="text-lg font-semibold text-rose-950">Voin auttaa</h3>
      <p className="mt-1 text-sm text-rose-900/80">
        Tarjoa vapaaehtoista apua — ei hintaa eikä tarjousta. Pyytäjä valitsee
        auttajan ja vahvistaa myöhemmin, että apu toteutui.
      </p>
      <input type="hidden" name="request_id" value={requestId} />
      <textarea
        name="message"
        rows={2}
        placeholder="Lyhyt viesti (valinnainen): esim. voin tulla klo 18"
        className={`mt-3 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm ${brand.input}`}
      />
      {state.error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-2 text-sm text-emerald-800" role="status">
          {state.ok}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 w-full rounded-2xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
      >
        {pending ? "Lähetetään…" : "Voin auttaa"}
      </button>
    </form>
  );
}
