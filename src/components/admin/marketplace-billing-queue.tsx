"use client";

import { useActionState } from "react";
import {
  markMarketplaceBillingInvoiced,
  markMarketplaceBillingPaid,
} from "@/app/actions/marketplace-admin";
import type { AdminState } from "@/app/actions/admin";

type Row = {
  id: string;
  kind: string;
  status: string;
  amount: string;
  description: string;
  invoiceReference: string | null;
  createdAt: string;
  sellerName: string;
  sellerRole: string;
  planName?: string;
};

export function MarketplaceBillingQueue({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-8 rounded-lg bg-white p-6 text-stone-600">
        Ei avoimia laskutuspyyntöjä.
      </p>
    );
  }

  return (
    <ul className="mt-8 space-y-4">
      {rows.map((row) => (
        <BillingRow key={row.id} row={row} />
      ))}
    </ul>
  );
}

function BillingRow({ row }: { row: Row }) {
  const [paidState, paidAction, paidPending] = useActionState<
    AdminState,
    FormData
  >(markMarketplaceBillingPaid, {});

  const [invState, invAction, invPending] = useActionState<
    AdminState,
    FormData
  >(markMarketplaceBillingInvoiced, {});

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="font-medium">{row.description}</p>
          <p className="text-sm text-stone-500">
            {row.sellerName} · {row.sellerRole} · {row.amount}
          </p>
          <p className="text-xs text-stone-400">
            {new Date(row.createdAt).toLocaleString("fi-FI")} · {row.kind} ·{" "}
            <span className="font-medium">{row.status}</span>
          </p>
        </div>
        {row.planName && (
          <span className="rounded-full bg-stone-100 px-2 py-1 text-xs">
            {row.planName}
          </span>
        )}
      </div>

      {(paidState.ok || invState.ok) && (
        <p className="mt-2 text-sm text-sky-700">{paidState.ok ?? invState.ok}</p>
      )}
      {(paidState.error || invState.error) && (
        <p className="mt-2 text-sm text-red-600">{paidState.error ?? invState.error}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={invAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="request_id" value={row.id} />
          <label className="text-xs text-stone-500">
            Viite
            <input
              name="invoice_reference"
              defaultValue={row.invoiceReference ?? ""}
              className="mt-0.5 block rounded border border-stone-300 px-2 py-1 text-sm"
              placeholder="Laskun viite"
            />
          </label>
          <button
            type="submit"
            disabled={invPending}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-60"
          >
            Laskutettu
          </button>
        </form>
        <form action={paidAction}>
          <input type="hidden" name="request_id" value={row.id} />
          <button
            type="submit"
            disabled={paidPending}
            className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
          >
            Maksettu
          </button>
        </form>
      </div>
    </li>
  );
}
