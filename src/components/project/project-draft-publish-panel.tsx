"use client";

import { useActionState } from "react";
import {
  publishProject,
  type ProjectActionState,
} from "@/app/actions/projects";
import { brand } from "@/lib/brand-theme";

export function ProjectDraftPublishPanel({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<
    ProjectActionState,
    FormData
  >(publishProject, {});

  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
      <h2 className="font-semibold text-amber-950">Luonnos — ei vielä julkaistu</h2>
      <p className="mt-2 text-sm leading-relaxed text-amber-900">
        Urakoitsijat eivät näe tätä pyyntöä. Tarkista tiedot alla ja julkaise, kun
        olet valmis.
      </p>
      {state.error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <form action={formAction} className="mt-4">
        <input type="hidden" name="project_id" value={projectId} />
        <button
          type="submit"
          disabled={pending}
          className={`${brand.btnPrimary} disabled:opacity-60`}
        >
          {pending ? "Julkaistaan…" : "Julkaise tarjouspyyntö"}
        </button>
      </form>
    </section>
  );
}
