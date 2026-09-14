"use client";

import { useActionState } from "react";
import {
  submitPlatformFeedbackSupport,
  type PlatformFeedbackSupportActionState,
} from "@/app/actions/platform-feedback";
import { brand, formInputClass } from "@/lib/brand-theme";

export function PlatformFeedbackSupportForm({
  feedbackId,
  guestEmail,
  compact = false,
}: {
  feedbackId: string;
  guestEmail?: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState<
    PlatformFeedbackSupportActionState,
    FormData
  >(submitPlatformFeedbackSupport, {});

  if (state.success) {
    return (
      <p
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        role="status"
      >
        {state.success}
      </p>
    );
  }

  return (
    <form action={action} className={compact ? "space-y-3" : "mt-4 space-y-4"}>
      <input type="hidden" name="feedback_id" value={feedbackId} />
      {guestEmail !== undefined && (
        <div>
          <label htmlFor="support_guest_email" className="text-sm font-medium text-stone-900">
            Sähköposti *
          </label>
          <input
            id="support_guest_email"
            name="guest_email"
            type="email"
            required
            defaultValue={guestEmail}
            className={`${formInputClass} mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm`}
            placeholder="Sama osoite kuin palautteessa"
          />
        </div>
      )}
      <div>
        <label htmlFor="support_message" className="text-sm font-medium text-stone-900">
          Viesti ylläpidolle *
        </label>
        <p className="mt-0.5 text-xs text-stone-600">
          Kysymys, bugi-ilmoitus tai muu asia — yksi palaute per sähköposti on jo
          käytetty.
        </p>
        <textarea
          id="support_message"
          name="message"
          rows={compact ? 3 : 4}
          required
          minLength={10}
          className={`${formInputClass} mt-2 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm`}
          placeholder="Kerro lyhyesti, miten voimme auttaa..."
        />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={brand.btnSecondary}>
        {pending ? "Lähetetään…" : "Lähetä tukipyyntö"}
      </button>
    </form>
  );
}
