"use client";

import { useActionState } from "react";
import {
  deleteCustomerProject,
  type DeleteProjectActionState,
} from "@/app/actions/projects";

export function DeleteProjectButton({
  projectId,
  title,
}: {
  projectId: string;
  title: string;
}) {
  const [state, action, pending] = useActionState<
    DeleteProjectActionState,
    FormData
  >(deleteCustomerProject, {});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (
      !confirm(
        `Poistetaanko "${title}" pysyvästi?\n\nTarjoukset, viestit ja liitteet poistuvat. Tätä ei voi perua.`,
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action} onSubmit={handleSubmit} className="inline-flex">
        <input type="hidden" name="project_id" value={projectId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          {pending ? "Poistetaan…" : "Poista pysyvästi"}
        </button>
      </form>
      {state.error && (
        <p className="max-w-xs text-right text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
