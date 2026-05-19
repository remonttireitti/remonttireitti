"use client";

import { useActionState } from "react";
import {
  requestContractorPlan,
  type MarketplaceActionState,
} from "@/app/actions/marketplace";
import { brand } from "@/lib/brand-theme";
import type { MarketplacePlanSlug } from "@/lib/marketplace-pricing";

export function MarketplaceOrderForm({
  planSlug,
}: {
  planSlug: MarketplacePlanSlug;
}) {
  const [state, action, pending] = useActionState<
    MarketplaceActionState,
    FormData
  >(requestContractorPlan, {});

  return (
    <form action={action} className="mt-8 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
      <input type="hidden" name="plan_slug" value={planSlug} />

      <p className="text-sm text-stone-600">
        Painamalla lähetät tilauspyynnön. Saat laskun sähköpostitse ja
        paketti aktivoituu maksun kirjauksen jälkeen (1–2 arkipäivää).
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
