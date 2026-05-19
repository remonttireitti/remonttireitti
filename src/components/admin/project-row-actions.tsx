"use client";

import { useActionState } from "react";
import {
  cancelProject,
  deleteProject,
} from "@/app/actions/admin-projects";
import type { AdminState } from "@/app/actions/admin";
import type { ProjectStatus } from "@/types/database";

export function ProjectRowActions({
  projectId,
  title,
  status,
}: {
  projectId: string;
  title: string;
  status: ProjectStatus;
}) {
  const [cancelState, cancelAction, cancelPending] = useActionState<
    AdminState,
    FormData
  >(cancelProject, {});
  const [delState, delAction, delPending] = useActionState<
    AdminState,
    FormData
  >(deleteProject, {});

  const msg = cancelState.ok || delState.ok;
  const err = cancelState.error || delState.error;

  const canCancel = !["cancelled", "completed"].includes(status);

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-stone-100 pt-3">
      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <form
            action={cancelAction}
            onSubmit={(e) => {
              if (
                !confirm(
                  `Perutaanko tarjouspyyntö "${title}"? Urakoitsijat eivät näe sitä enää listalla.`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="project_id" value={projectId} />
            <button
              type="submit"
              disabled={cancelPending}
              className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Peruuta pyyntö
            </button>
          </form>
        )}

        <form
          action={delAction}
          onSubmit={(e) => {
            if (
              !confirm(
                `Poistetaanko "${title}" pysyvästi? Tarjoukset, viestit ja laskut poistuvat. Tätä ei voi perua.`,
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="project_id" value={projectId} />
          <button
            type="submit"
            disabled={delPending}
            className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Poista pysyvästi
          </button>
        </form>
      </div>

      {msg && <p className="text-xs text-sky-700">{msg}</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
