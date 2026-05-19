"use client";

import { useActionState } from "react";
import {
  submitReview,
  type LifecycleActionState,
} from "@/app/actions/project-lifecycle";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function ReviewForm({
  projectId,
  contractorName,
}: {
  projectId: string;
  contractorName: string;
}) {
  const [state, action, pending] = useActionState<
    LifecycleActionState,
    FormData
  >(submitReview, {});

  return (
    <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
      <h2 className="text-lg font-semibold text-amber-950">
        Arvostele urakoitsija
      </h2>
      <p className="mt-1 text-sm text-amber-900/80">
        Kerro kokemuksestasi yrityksestä {contractorName}. Arvostelu auttaa
        muita asiakkaita.
      </p>

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="project_id" value={projectId} />

        <fieldset>
          <legend className="text-sm font-medium">Arvosana *</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[5, 4, 3, 2, 1].map((n) => (
              <label
                key={n}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm has-checked:border-amber-500 has-checked:bg-amber-100"
              >
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  required
                  className="sr-only"
                />
                <span className="text-amber-500">{"★".repeat(n)}</span>
                <span>{n}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm font-medium">
          Kommentti *
          <textarea
            name="body"
            rows={4}
            required
            minLength={10}
            placeholder="Miten asennus sujui? Aikataulu, siisteys, viestintä…"
            className={inputClass}
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium">
            Suosittelisitko muille?
          </legend>
          <div className="mt-2 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="would_recommend" value="yes" defaultChecked />
              Kyllä
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="would_recommend" value="no" />
              En
            </label>
          </div>
        </fieldset>

        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-sky-700" role="status">
            {state.success}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {pending ? "Lähetetään…" : "Lähetä arvostelu"}
        </button>
      </form>
    </section>
  );
}
