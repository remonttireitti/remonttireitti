"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  submitProjectCompletionUpdate,
  type CompletionRequestActionState,
} from "@/app/actions/project-completion-request";
import { ProjectPhotoUpload } from "@/components/project/project-photo-upload";
import { brand } from "@/lib/brand-theme";
import type { AggregatedCompletionNeed } from "@/lib/project-completion-requests-server";

export function CustomerCompletionForm({
  projectId,
  needs,
  requestCount,
  guestToken,
}: {
  projectId: string;
  needs: AggregatedCompletionNeed;
  requestCount: number;
  guestToken?: string;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [state, action, pending] = useActionState<
    CompletionRequestActionState,
    FormData
  >(submitProjectCompletionUpdate, {});

  useEffect(() => {
    if (state.ok && state.redirectPath) {
      router.push(state.redirectPath);
    }
  }, [state.ok, state.redirectPath, router]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="project_id" value={projectId} />
      {guestToken && (
        <input type="hidden" name="guest_token" value={guestToken} />
      )}

      <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
        <h2 className="font-semibold text-violet-950">Urakoitsija tarvitsee tarjousta varten</h2>
        {requestCount > 1 && (
          <p className="mt-1 text-sm text-violet-900">
            {requestCount} urakoitsijaa on pyytänyt täydennystä. Täydennä kerralla kaikille.
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {needs.labels.map((label) => (
            <li
              key={label}
              className="flex items-start gap-2 rounded-lg bg-white/90 px-3 py-2 text-sm text-violet-950"
            >
              <span className="text-violet-700" aria-hidden>
                ☑
              </span>
              {label}
            </li>
          ))}
        </ul>

        {needs.contractorNotes.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
              Urakoitsijoiden viestit
            </p>
            {needs.contractorNotes.map((note, i) => (
              <blockquote
                key={`${i}-${note.slice(0, 24)}`}
                className="rounded-lg border border-violet-100 bg-white/80 px-3 py-2 text-sm italic text-violet-900"
              >
                "{note}"
              </blockquote>
            ))}
          </div>
        )}

        {needs.preliminaryRanges.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Alustavia arvioita nykyisillä tiedoilla:</p>
            <ul className="mt-2 space-y-1">
              {needs.preliminaryRanges.map((r, i) => {
                const min = r.min != null ? Math.round(r.min / 100) : null;
                const max = r.max != null ? Math.round(r.max / 100) : null;
                const range =
                  min != null && max != null
                    ? `${min.toLocaleString("fi-FI")}–${max.toLocaleString("fi-FI")} €`
                    : min != null
                      ? `n. ${min.toLocaleString("fi-FI")} €`
                      : max != null
                        ? `enintään ${max.toLocaleString("fi-FI")} €`
                        : "—";
                return (
                  <li key={i}>
                    {r.company}: {range}
                    {r.note ? ` — ${r.note}` : ""}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-stone-900">Lisää puuttuvat tiedot</h2>
        <p className="mt-1 text-sm text-stone-600">
          Kirjoita mitat, materiaalitoiveet ja muut pyydetyt tiedot. Voit liittää myös
          kuvia.
        </p>

        <label className="mt-4 block text-sm text-stone-800">
          Täydennys kuvaukseen
          <textarea
            name="description_append"
            rows={5}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            placeholder="Esim. kattopinta-ala 145 m², aluskate uusitaan, liitteenä kuvat jokaiselta sivulta."
          />
        </label>

        <div className="mt-4">
          <ProjectPhotoUpload
            name="project_photos"
            files={photos}
            onFilesChange={setPhotos}
            emptyLabel="Lisää pyydetyt kuvat"
            hint="Kuvat liitetään tarjouspyyntöön. Enintään 8 kuvaa."
          />
        </div>
      </section>

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
        className={`${brand.btnPrimary} disabled:opacity-60`}
      >
        {pending ? "Päivitetään…" : "Päivitä tarjouspyyntö"}
      </button>
    </form>
  );
}
