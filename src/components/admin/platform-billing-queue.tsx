"use client";

import { useActionState } from "react";
import {
  markPlatformInvoiceInvoiced,
  markPlatformInvoicePaid,
} from "@/app/actions/platform-invoices-admin";
import type { AdminState } from "@/app/actions/admin";
import { formatPlatformFee } from "@/lib/platform-fee";
import { formInputClass } from "@/lib/brand-theme";

export type PlatformBillingRow = {
  id: string;
  status: string;
  amountCents: number;
  dueAt: string;
  invoicedAt: string | null;
  invoiceReference: string | null;
  adminNotes: string | null;
  createdAt: string;
  projectId: string;
  projectTitle: string;
  companyName: string;
  businessId: string | null;
  billingEmail: string | null;
  loginEmail: string | null;
  billingAddress: string | null;
};

export function PlatformBillingQueue({ rows }: { rows: PlatformBillingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded-lg bg-white p-6 text-stone-600">
        Ei avoimia välityslaskuja.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-4">
      {rows.map((row) => (
        <PlatformBillingRowCard key={row.id} row={row} />
      ))}
    </ul>
  );
}

function PlatformBillingRowCard({ row }: { row: PlatformBillingRow }) {
  const [paidState, paidAction, paidPending] = useActionState<
    AdminState,
    FormData
  >(markPlatformInvoicePaid, {});

  const [invState, invAction, invPending] = useActionState<
    AdminState,
    FormData
  >(markPlatformInvoiceInvoiced, {});

  const invoiceTo = row.billingEmail || row.loginEmail;

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="font-medium">{row.projectTitle}</p>
          <p className="text-sm text-stone-600">
            {row.companyName} · {formatPlatformFee(row.amountCents)} (+ ALV)
          </p>
          <p className="text-xs text-stone-400">
            {new Date(row.createdAt).toLocaleString("fi-FI")}
            {row.invoicedAt
              ? ` · laskutettu ${new Date(row.invoicedAt).toLocaleDateString("fi-FI")}`
              : " · odottaa laskutusta"}
          </p>
        </div>
        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-900">
          {row.status === "pending" && !row.invoicedAt
            ? "Laskutettava"
            : row.status === "pending"
              ? "Lasku lähetetty"
              : row.status}
        </span>
      </div>

      <dl className="mt-3 grid gap-1 text-sm text-stone-700 sm:grid-cols-2">
        {invoiceTo && (
          <div>
            <dt className="text-xs text-stone-500">Laskutus-sähköposti</dt>
            <dd className="font-medium">{invoiceTo}</dd>
          </div>
        )}
        {row.businessId && (
          <div>
            <dt className="text-xs text-stone-500">Y-tunnus</dt>
            <dd className="font-medium">{row.businessId}</dd>
          </div>
        )}
        {row.billingAddress && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-stone-500">Laskutusosoite</dt>
            <dd className="font-medium">{row.billingAddress}</dd>
          </div>
        )}
        {!invoiceTo && !row.businessId && !row.billingAddress && (
          <p className="sm:col-span-2 text-amber-800 text-xs">
            Laskutustiedot puuttuvat — pyydä urakoitsijaa täydentämään Oma tili.
          </p>
        )}
        <div>
          <dt className="text-xs text-stone-500">Eräpäivä</dt>
          <dd>{new Date(row.dueAt).toLocaleDateString("fi-FI")}</dd>
        </div>
      </dl>

      {(paidState.ok || invState.ok) && (
        <p className="mt-2 text-sm text-sky-700">{paidState.ok ?? invState.ok}</p>
      )}
      {(paidState.error || invState.error) && (
        <p className="mt-2 text-sm text-red-600">
          {paidState.error ?? invState.error}
        </p>
      )}

      <div className="mt-4 space-y-4 border-t border-stone-100 pt-4">
        <form
          action={invAction}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <input type="hidden" name="invoice_id" value={row.id} />
          <label className="block text-xs font-medium text-stone-500">
            Laskun viite
            <input
              name="invoice_reference"
              defaultValue={row.invoiceReference ?? ""}
              className={`mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm ${formInputClass}`}
              placeholder="Esim. kevytyrittäjä-viite"
            />
          </label>
          <label className="block text-xs font-medium text-stone-500">
            Muistiinpano
            <input
              name="admin_notes"
              defaultValue={row.adminNotes ?? ""}
              className={`mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm ${formInputClass}`}
            />
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              disabled={invPending}
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60 lg:w-auto"
            >
              {invPending ? "Tallennetaan…" : "Merkitse laskutetuksi"}
            </button>
          </div>
        </form>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form action={paidAction}>
            <input type="hidden" name="invoice_id" value={row.id} />
            <button
              type="submit"
              disabled={paidPending}
              className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 sm:w-auto"
            >
              {paidPending ? "Tallennetaan…" : "Maksettu"}
            </button>
          </form>
          <a
            href={`/remontti/${row.projectId}`}
            className="text-center text-sm text-sky-700 hover:underline sm:text-left"
          >
            Avaa urakka →
          </a>
        </div>
      </div>
    </li>
  );
}
