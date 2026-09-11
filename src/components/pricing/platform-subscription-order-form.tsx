"use client";

import { useActionState } from "react";
import {
  requestPlatformSubscription,
  type PlatformSubscriptionActionState,
} from "@/app/actions/platform-subscription";
import { brand } from "@/lib/brand-theme";
import type { PlatformSubscriptionSlug } from "@/lib/platform-pricing";

export function PlatformSubscriptionOrderForm({
  periodSlug,
}: {
  periodSlug: PlatformSubscriptionSlug;
}) {
  const [state, action, pending] = useActionState<
    PlatformSubscriptionActionState,
    FormData
  >(requestPlatformSubscription, {});

  return (
    <form
      action={action}
      className="mt-8 space-y-4 rounded-xl border border-stone-200 bg-white p-6"
    >
      <input type="hidden" name="period_slug" value={periodSlug} />

      <p className="text-sm text-stone-600">
        Painamalla lähetät tilauspyynnön. Saat laskun sähköpostitse ja kuukausitilaus
        aktivoituu maksun kirjauksen jälkeen. Per-diili -palkkioita ei veloiteta
        tilausjakson aikana.
      </p>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900" role="status">
          {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className={`w-full ${brand.btnPrimary}`}>
        {pending ? "Lähetetään…" : "Lähetä tilauspyyntö"}
      </button>
    </form>
  );
}
