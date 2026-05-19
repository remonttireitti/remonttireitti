"use client";

import { useActionState } from "react";
import {
  completeProject,
  markProjectInProgress,
  type LifecycleActionState,
} from "@/app/actions/project-lifecycle";
import type { ProjectStatus } from "@/types/database";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function ProjectLifecyclePanel({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const [completeState, completeAction, completePending] = useActionState<
    LifecycleActionState,
    FormData
  >(completeProject, {});

  const [progressState, progressAction, progressPending] = useActionState<
    LifecycleActionState,
    FormData
  >(markProjectInProgress, {});

  if (status === "completed" || status === "cancelled") return null;

  if (status === "bid_accepted") {
    return (
      <section className="mt-6 space-y-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-6">
        <h2 className="font-semibold text-sky-950">Urakan eteneminen</h2>
        <p className="text-sm text-sky-800">
          Tarjous on hyväksytty. Merkitse urakka käynnissä olevaksi tai suoraan
          valmiiksi, kun työ on tehty.
        </p>

        <form action={progressAction} className="flex flex-wrap gap-3">
          <input type="hidden" name="project_id" value={projectId} />
          <button
            type="submit"
            disabled={progressPending}
            className="rounded-lg border border-sky-600 bg-white px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-60"
          >
            Urakka käynnissä
          </button>
        </form>
        {progressState.success && (
          <p className="text-sm text-sky-700">{progressState.success}</p>
        )}

        <CompleteProjectForm
          projectId={projectId}
          action={completeAction}
          pending={completePending}
          state={completeState}
        />
      </section>
    );
  }

  if (status === "in_progress") {
    return (
      <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/60 p-6">
        <h2 className="font-semibold text-sky-950">Merkitse valmiiksi</h2>
        <p className="mt-1 text-sm text-sky-800">
          Kun asennus on valmis, merkitse urakka valmiiksi ja jätä halutessasi
          lyhyt muistiinpano.
        </p>
        <CompleteProjectForm
          projectId={projectId}
          action={completeAction}
          pending={completePending}
          state={completeState}
        />
      </section>
    );
  }

  return null;
}

function CompleteProjectForm({
  projectId,
  action,
  pending,
  state,
}: {
  projectId: string;
  action: (payload: FormData) => void;
  pending: boolean;
  state: LifecycleActionState;
}) {
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      <label className="block text-sm font-medium text-stone-700">
        Kommentti urakasta (valinnainen)
        <textarea
          name="completion_notes"
          rows={3}
          placeholder="Esim. kaikki sujui hyvin, pieni viive säästä johtuen…"
          className={inputClass}
        />
      </label>
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
        className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Merkitse urakka valmiiksi"}
      </button>
    </form>
  );
}
