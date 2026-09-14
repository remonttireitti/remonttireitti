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

function GuestUsageContextSelector() {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-900">
        Oletko käyttänyt Remonttireitti-palvelua vai vain selannut sivustoa? *
      </legend>
      <p className="mt-0.5 text-xs text-stone-600">
        Esim. tarjouspyynnön luonti, tarjouksen jättäminen tai urakan seuranta lasketaan
        palvelun käytöksi.
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        {[
          {
            value: "used_service",
            label: "Käytin palvelua",
          },
          {
            value: "browsed_only",
            label: "Vain selasin sivustoa",
          },
        ].map((opt) => (
          <label
            key={opt.value}
            className="flex min-h-[2.75rem] flex-1 cursor-pointer items-center rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm has-checked:border-sky-500 has-checked:bg-sky-50"
          >
            <input
              type="radio"
              name="guest_usage_context"
              value={opt.value}
              required
              className="mr-2 shrink-0"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RoleSelector({ defaultRole }: { defaultRole?: "customer" | "contractor" }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-900">
        Kenen näkökulmasta annat palautteen? *
      </legend>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        {[
          { value: "customer", label: "Asiakas — käytin palvelua tekijän etsintään" },
          { value: "contractor", label: "Urakoitsija — käytin palvelua töiden hakuun" },
        ].map((opt) => (
          <label
            key={opt.value}
            className="flex min-h-[2.75rem] flex-1 cursor-pointer items-center rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm has-checked:border-sky-500 has-checked:bg-sky-50"
          >
            <input
              type="radio"
              name="feedback_role"
              value={opt.value}
              required
              defaultChecked={defaultRole === opt.value}
              className="mr-2 shrink-0"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PlatformFeedbackForm({
  defaultRole,
  projectId,
  compact = false,
  requireGuestEmail = false,
  userEmail,
}: {
  defaultRole?: "customer" | "contractor";
  projectId?: string;
  compact?: boolean;
  requireGuestEmail?: boolean;
  userEmail?: string | null;
}) {
  const [state, action, pending] = useActionState<
    PlatformFeedbackActionState,
    FormData
  >(submitPlatformFeedback, {});

  if (state.success) {
    return (
      <p
        className={`rounded-xl border px-4 py-3 text-sm ${
          state.pendingVerification
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-sky-200 bg-sky-50 text-sky-900"
        }`}
        role="status"
      >
        {state.success}
      </p>
    );
  }

  return (
    <form action={action} className={compact ? "space-y-4" : "mt-4 space-y-5"}>
      {projectId && <input type="hidden" name="project_id" value={projectId} />}

      {projectId && defaultRole ? (
        <input type="hidden" name="feedback_role" value={defaultRole} />
      ) : (
        !projectId && <RoleSelector defaultRole={defaultRole} />
      )}

      {requireGuestEmail && !projectId && <GuestUsageContextSelector />}

      {requireGuestEmail && (
        <div>
          <label htmlFor="guest_email" className="text-sm font-medium text-stone-900">
            Sähköposti *
          </label>
          <p className="mt-0.5 text-xs text-stone-600">
            Lähetämme vahvistuslinkin — palaute lasketaan tilastoihin vasta
            vahvistuksen jälkeen. Yksi palaute per sähköposti.
          </p>
          <input
            id="guest_email"
            name="guest_email"
            type="email"
            required
            autoComplete="email"
            defaultValue={userEmail ?? ""}
            readOnly={Boolean(userEmail)}
            className={`${formInputClass} mt-2 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm`}
            placeholder="nimi@esimerkki.fi"
          />
        </div>
      )}

      {!compact && !projectId && (
        <p className="text-sm text-stone-600">
          Arvioi Remonttireitti-palvelun käyttökokemus valitsemastasi
          näkökulmasta. Palaute auttaa kehittämään palvelua — se on erillinen
          urakoitsijan tähtiarvosteluista.
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
        <label
          htmlFor="platform_feedback_suggestions"
          className="text-sm font-medium text-stone-900"
        >
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

      <button type="submit" disabled={pending} className={brand.btnPrimary}>
        {pending ? "Lähetetään…" : requireGuestEmail ? "Lähetä ja vahvista sähköpostilla" : "Lähetä palaute"}
      </button>
    </form>
  );
}
