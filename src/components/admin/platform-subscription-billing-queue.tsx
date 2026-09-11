"use client";

import { useActionState } from "react";
import { markPlatformSubscriptionPaid } from "@/app/actions/platform-subscription-admin";
import type { AdminState } from "@/app/actions/admin";
import { brand } from "@/lib/brand-theme";

export type PlatformSubscriptionBillingRow = {
  id: string;
  status: string;
  amount: string;
  description: string;
  companyName: string;
  createdAt: string;
};

export function PlatformSubscriptionBillingQueue({
  rows,
}: {
  rows: PlatformSubscriptionBillingRow[];
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    markPlatformSubscriptionPaid,
    {},
  );

  if (!rows.length) {
    return (
      <p className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500">
        Ei avoimia kuukausitilauspyyntöjä.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
          {state.ok}
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-stone-200 bg-white p-4 text-sm"
          >
            <p className="font-medium text-stone-900">{row.companyName}</p>
            <p className="mt-1 text-stone-600">{row.description}</p>
            <p className="mt-1 text-stone-500">
              {row.amount} · {new Date(row.createdAt).toLocaleString("fi-FI")} ·{" "}
              {row.status}
            </p>
            <form action={action} className="mt-3">
              <input type="hidden" name="request_id" value={row.id} />
              <button
                type="submit"
                disabled={pending}
                className={`${brand.btnPrimary} text-sm`}
              >
                Merkitse maksetuksi ja aktivoi tilaus
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
