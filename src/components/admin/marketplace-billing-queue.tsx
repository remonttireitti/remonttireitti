"use client";

import { useActionState, useState } from "react";
import {
  markMarketplaceBillingInvoiced,
  markMarketplaceBillingPaid,
  rejectMarketplaceBillingRequest,
} from "@/app/actions/marketplace-admin";
import type { AdminState } from "@/app/actions/admin";
import { formInputClass } from "@/lib/brand-theme";

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
  listingTitle?: string | null;
};

const kindLabels: Record<string, string> = {
  subscription: "Kuukausitilaus",
  listing: "Ilmoitus",
  listing_renewal: "Uusiminen",
};

function statusBadge(status: string) {
  if (status === "pending") {
    return (
      <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-900">
        Laskutettava
      </span>
    );
  }
  if (status === "invoiced") {
    return (
      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-900">
        Lasku lähetetty
      </span>
    );
  }
  return (
    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
      {status}
    </span>
  );
}

export function MarketplaceBillingQueue({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded-lg bg-white p-6 text-stone-600">
        Ei avoimia laskutuspyyntöjä.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-4">
      {rows.map((row) => (
        <BillingRow key={row.id} row={row} />
      ))}
    </ul>
  );
}

function BillingRow({ row }: { row: Row }) {
  const [confirmReject, setConfirmReject] = useState(false);

  const [paidState, paidAction, paidPending] = useActionState<
    AdminState,
    FormData
  >(markMarketplaceBillingPaid, {});

  const [invState, invAction, invPending] = useActionState<
    AdminState,
    FormData
  >(markMarketplaceBillingInvoiced, {});

  const [rejectState, rejectAction, rejectPending] = useActionState<
    AdminState,
    FormData
  >(rejectMarketplaceBillingRequest, {});

  const feedback =
    paidState.ok ?? invState.ok ?? rejectState.ok ?? null;
  const error =
    paidState.error ?? invState.error ?? rejectState.error ?? null;

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-stone-900">{row.description}</p>
          {row.listingTitle && (
            <p className="mt-0.5 text-sm text-stone-600">
              Ilmoitus: {row.listingTitle}
            </p>
          )}
          <p className="mt-1 text-sm text-stone-500">
            {row.sellerName} · {row.sellerRole} · {row.amount}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            {new Date(row.createdAt).toLocaleString("fi-FI")} ·{" "}
            {kindLabels[row.kind] ?? row.kind}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {row.planName && (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">
              {row.planName}
            </span>
          )}
          {statusBadge(row.status)}
        </div>
      </div>

      {feedback && (
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {feedback}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-4 border-t border-stone-100 pt-4">
        <form
          action={invAction}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <input type="hidden" name="request_id" value={row.id} />
          <label className="block text-xs font-medium text-stone-500">
            Laskun viite
            <input
              name="invoice_reference"
              defaultValue={row.invoiceReference ?? ""}
              className={`mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm ${formInputClass}`}
              placeholder="Esim. kevytyrittäjä-viite"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={invPending}
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60 sm:w-auto"
            >
              {invPending ? "Tallennetaan…" : "Merkitse laskutetuksi"}
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <form action={paidAction} className="sm:order-1">
            <input type="hidden" name="request_id" value={row.id} />
            <button
              type="submit"
              disabled={paidPending}
              className="w-full rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-60 sm:w-auto"
            >
              {paidPending ? "Tallennetaan…" : "Maksettu — julkaise"}
            </button>
          </form>

          {!confirmReject ? (
            <button
              type="button"
              onClick={() => setConfirmReject(true)}
              className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 sm:order-2 sm:w-auto"
            >
              Hylkää ja poista
            </button>
          ) : (
            <form
              action={rejectAction}
              className="w-full space-y-2 rounded-lg border border-red-100 bg-red-50/50 p-3 sm:order-2 sm:max-w-md"
            >
              <input type="hidden" name="request_id" value={row.id} />
              <p className="text-sm font-medium text-red-900">
                Poistetaan laskutusjonosta ja ilmoitus perutaan. Myyjä saa
                ilmoituksen.
              </p>
              <label className="block text-xs font-medium text-stone-600">
                Syy (valinnainen, näkyy myyjälle)
                <input
                  name="reject_reason"
                  className={`mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm ${formInputClass}`}
                  placeholder="Esim. puutteelliset tiedot"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={rejectPending}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {rejectPending ? "Poistetaan…" : "Kyllä, hylkää ja poista"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReject(false)}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  Peruuta
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}
