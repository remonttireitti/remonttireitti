"use client";

import { useActionState } from "react";
import {
  submitPlatformFeedback,
  type PlatformFeedbackActionState,
} from "@/app/actions/platform-feedback";
import { brand, formInputClass } from "@/lib/brand-theme";

function StarRatingField({
  name,
  legend,
  description,
}: {
  name: string;
  legend: string;
  description?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-900">{legend}</legend>
      {description && (
        <p className="mt-0.5 text-xs text-stone-600">{description}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {[5, 4, 3, 2, 1].map((n) => (
          <label
            key={n}
            className="flex min-h-[2.75rem] cursor-pointer items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm has-checked:border-sky-500 has-checked:bg-sky-50"
          >
            <input
              type="radio"
              name={name}
              value={n}
              required
              className="sr-only"
            />
            <span className="text-sky-500">{"★".repeat(n)}</span>
            <span className="text-stone-500">{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PlatformFeedbackForm({
  role,
  projectId,
  compact = false,
}: {
  role: "customer" | "contractor";
  projectId?: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState<
    PlatformFeedbackActionState,
    FormData
  >(submitPlatformFeedback, {});

  const roleLabel = role === "customer" ? "asiakkaana" : "urakoitsijana";

  if (state.success) {
    return (
      <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" role="status">
        {state.success}
      </p>
    );
  }

  return (
    <form action={action} className={compact ? "space-y-4" : "mt-4 space-y-5"}>
      {projectId && <input type="hidden" name="project_id" value={projectId} />}

      {!compact && (
        <p className="text-sm text-stone-600">
          Arvioi Remonttivalitys-palvelun käyttökokemus {roleLabel}. Tämä on
          erillinen urakoitsijan arvostelusta — kerro meille, miten palvelu
          toimi.
        </p>
      )}

      <StarRatingField
        name="clarity_rating"
        legend="Kuinka selkeä palvelu oli? *"
        description="Esim. tarjouspyynnön luonti, tarjousten vertailu tai urakan seuranta"
      />

      <StarRatingField
        name="experience_rating"
        legend="Kuinka miellyttävä käyttökokemus oli? *"
        description="Käytettävyys, nopeus ja yleinen fiilis"
      />

      <fieldset>
        <legend className="text-sm font-medium text-stone-900">
          Suosittelisitko palvelua muille? *
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { value: "yes", label: "Kyllä" },
            { value: "no", label: "En" },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex min-h-[2.75rem] cursor-pointer items-center rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm has-checked:border-sky-500 has-checked:bg-sky-50"
            >
              <input
                type="radio"
                name="would_recommend"
                value={opt.value}
                required
                className="mr-2"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="platform_feedback_suggestions" className="text-sm font-medium text-stone-900">
          Parannusehdotukset ja muu palaute
        </label>
        <p className="mt-0.5 text-xs text-stone-600">
          Valinnainen — kerro mitä voisimme tehdä paremmin
        </p>
        <textarea
          id="platform_feedback_suggestions"
          name="suggestions"
          rows={compact ? 3 : 4}
          className={`${formInputClass} mt-2 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm`}
          placeholder="Esim. selkeämmät ohjeet, uusia toimintoja, häiritseviä kohtia..."
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={brand.btnPrimary}
      >
        {pending ? "Lähetetään…" : "Lähetä palaute"}
      </button>
    </form>
  );
}
