"use client";

import { useActionState } from "react";
import {
  requestProjectCompletion,
  type CompletionRequestActionState,
} from "@/app/actions/project-completion-request";
import type { ProjectQualityItem } from "@/lib/project-request-quality";

export function ContractorCompletionRequestPanel({
  projectId,
  qualityScore,
  missingItems,
  alreadySent,
}: {
  projectId: string;
  qualityScore: number;
  missingItems: ProjectQualityItem[];
  alreadySent: boolean;
}) {
  const [state, action, pending] = useActionState<
    CompletionRequestActionState,
    FormData
  >(requestProjectCompletion, {});

  const actionable = missingItems.filter((i) => i.status !== "done");

  if (actionable.length === 0 && qualityScore >= 75) {
    return (
      <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-950">
        Tarjouspyyntö näyttää riittävän kattavalta ({qualityScore} %). Voit jättää
        tarjouksen normaalisti.
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
      <h2 className="font-semibold text-violet-950">Pyydä täydennystä</h2>
      <p className="mt-1 text-sm text-violet-900">
        Pyyntö on {qualityScore} % valmis. Voit silti tarjota heti — tarkempaan
        hintaan tarvitset usein lisätietoja. Valitse mitä asiakkaan kannattaa
        täydentää.
      </p>

      {alreadySent && (
        <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs text-violet-900">
          Olet jo lähettänyt täydennäpyynnön. Asiakas saa ilmoituksen ja voi
          päivittää pyyntöä.
        </p>
      )}

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="project_id" value={projectId} />
        <fieldset className="space-y-2">
          {actionable.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-violet-100 bg-white/90 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="criterion_id"
                value={item.id}
                defaultChecked
                className="mt-1"
              />
              <span>
                <span className="font-medium text-stone-900">{item.label}</span>
                <span className="mt-0.5 block text-xs text-stone-600">{item.tip}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="block text-sm text-stone-700">
          Lisähuomio (valinnainen)
          <textarea
            name="note"
            rows={2}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            placeholder="Esim. tarvitsen pinta-alan ja kuvan asennuspaikasta ennen tarkkaa tarjousta"
          />
        </label>

        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="text-sm text-emerald-800" role="status">
            {state.ok}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || actionable.length === 0}
          className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-medium text-white hover:bg-violet-900 disabled:opacity-60"
        >
          {pending ? "Lähetetään…" : "Lähetä täydennäpyyntö asiakkaalle"}
        </button>
      </form>
    </section>
  );
}
