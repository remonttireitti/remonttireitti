"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  requestProjectCompletion,
  type CompletionRequestActionState,
} from "@/app/actions/project-completion-request";
import { COMPLETION_GAP_TYPES } from "@/constants/completion-gap-types";
import type { ProjectQualityItem } from "@/lib/project-request-quality";

export function ContractorCompletionRequestPanel({
  projectId,
  qualityScore,
  missingItems,
  alreadySent,
  hasBid,
}: {
  projectId: string;
  qualityScore: number;
  missingItems: ProjectQualityItem[];
  alreadySent: boolean;
  hasBid?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(!alreadySent && qualityScore < 75);
  const [state, action, pending] = useActionState<
    CompletionRequestActionState,
    FormData
  >(requestProjectCompletion, {});

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const actionable = missingItems.filter((i) => i.status !== "done");

  return (
    <section
      id="taydenna-pyynto"
      className="mt-6 scroll-mt-24 rounded-2xl border border-violet-100 bg-violet-50/30 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-stone-900">Puuttuuko tietoja?</h2>
          <p className="mt-1 text-sm text-stone-600">
            Pyyntö on {qualityScore} % valmis. Voit tarjota heti alla — tai pyytää
            asiakasta täydentämään ennen tarkkaa hintaa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="touch-target shrink-0 rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-50"
        >
          {expanded ? "Piilota" : "Pyydä täydennystä"}
        </button>
      </div>

      {alreadySent && (
        <p className="mt-4 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-900">
          Olet jo lähettänyt täydennäpyynnön. Asiakas saa ilmoituksen ja voi päivittää
          pyyntöä — voit silti tarjota milloin tahansa.
        </p>
      )}

      {expanded && (
        <form action={action} className="mt-5 space-y-4 border-t border-stone-100 pt-5">
          <input type="hidden" name="project_id" value={projectId} />

          <fieldset>
            <legend className="text-sm font-medium text-stone-900">
              Tarjouspyynnöstä puuttuu tietoja
            </legend>
            <div className="mt-2 space-y-2">
              {COMPLETION_GAP_TYPES.map((gap) => (
                <label
                  key={gap.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm"
                >
                  <input type="checkbox" name="gap_type" value={gap.id} className="mt-1" />
                  <span>
                    <span className="font-medium text-stone-900">{gap.label}</span>
                    <span className="mt-0.5 block text-xs text-stone-600">{gap.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {actionable.length > 0 && (
            <fieldset>
              <legend className="text-sm font-medium text-stone-900">
                Työlajiin liittyvät puuttuvat tiedot
              </legend>
              <div className="mt-2 space-y-2">
                {actionable.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="criterion_id"
                      value={item.id}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-stone-900">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-stone-600">{item.tip}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <label className="block text-sm text-stone-800">
            Mitä tarvitset tarjouksen tekemiseen? *
            <textarea
              name="note"
              rows={3}
              required
              minLength={10}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              placeholder='Esim. "Tarvitsen kuvat nykyisestä katosta, kattopinta-alan sekä tiedon siitä, uusitaanko aluskatetta."'
            />
          </label>

          <fieldset className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <legend className="px-1 text-sm font-medium text-amber-950">
              Alustava tarjous + täydennäpyyntö (valinnainen)
            </legend>
            <p className="text-xs text-amber-900">
              Voit antaa hintahaarukan nykyisillä tiedoilla ja kertoa mitä tarvitset
              tarkempaan tarjoukseen.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-stone-700">
                Min €
                <input
                  type="number"
                  name="preliminary_min_euros"
                  min={1}
                  step={1}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  placeholder="2500"
                />
              </label>
              <label className="block text-sm text-stone-700">
                Max €
                <input
                  type="number"
                  name="preliminary_max_euros"
                  min={1}
                  step={1}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  placeholder="3000"
                />
              </label>
            </div>
            <label className="mt-3 block text-sm text-stone-700">
              Huomio alustavasta arviosta
              <input
                type="text"
                name="preliminary_note"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                placeholder="Tarkka tarjous edellyttää kattopinta-alaa ja kuvia."
              />
            </label>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
            <input type="checkbox" name="suggest_template" className="mt-1" />
            <span>
              <span className="font-medium text-stone-900">
                Ehdota tämän alan tarjouspyynnön parannusta
              </span>
              <span className="mt-0.5 block text-xs text-stone-600">
                Jos useat urakoitsijat ehdottavat samaa, Remonttireitti voi lisätä sen
                tuleviin tarjouspyyntöihin.
              </span>
            </span>
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
            disabled={pending}
            className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-medium text-white hover:bg-violet-900 disabled:opacity-60"
          >
            {pending ? "Lähetetään…" : "Lähetä täydennäpyyntö asiakkaalle"}
          </button>
        </form>
      )}

      {!expanded && !alreadySent && qualityScore < 90 && (
        <p className="mt-4 text-xs text-stone-500">
          Tarjouslomake on heti tämän osion alla.{" "}
          <a href="#tarjouslomake" className="text-sky-700 hover:underline">
            Siirry tarjoamaan ↓
          </a>
        </p>
      )}
    </section>
  );
}
