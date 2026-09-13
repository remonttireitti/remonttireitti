"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  deleteLogEntry,
  type PropertyActionState,
} from "@/app/actions/property-log";
import { formatEurosFromCents } from "@/lib/bids";
import type { PropertyLogEntryRow } from "@/lib/property-log";

function formatLogDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ManualEntryDelete({
  entryId,
  propertyId,
}: {
  entryId: string;
  propertyId: string;
}) {
  const [state, action, pending] = useActionState<
    PropertyActionState,
    FormData
  >(deleteLogEntry, {});

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="entry_id" value={entryId} />
      <input type="hidden" name="property_id" value={propertyId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-red-700 hover:underline disabled:opacity-60"
      >
        {pending ? "Poistetaan…" : "Poista merkintä"}
      </button>
      {state.error && (
        <p className="mt-1 text-xs text-red-600">{state.error}</p>
      )}
    </form>
  );
}

export function PropertyLogEntryList({
  propertyId,
  entries,
}: {
  propertyId: string;
  entries: PropertyLogEntryRow[];
}) {
  if (entries.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-5 py-8 text-sm text-stone-600">
        Ei vielä merkintöjä. Valmiit urakat ilmestyvät automaattisesti — voit
        myös lisätä aiemmat remontit alla olevalla lomakkeella.
      </p>
    );
  }

  return (
    <ol className="mt-3 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
      {entries.map((entry) => (
        <li key={entry.id} className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-stone-900">{entry.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.source === "platform"
                      ? "bg-sky-50 text-sky-800 ring-1 ring-sky-100"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {entry.source === "platform" ? "Urakka" : "Manuaalinen"}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-500">
                {formatLogDate(entry.performed_at)}
                {entry.contractor_name && <> · {entry.contractor_name}</>}
              </p>
              {entry.description && (
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  {entry.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              {entry.amount_cents != null && (
                <p className="text-sm font-semibold text-stone-900">
                  {formatEurosFromCents(entry.amount_cents)}
                </p>
              )}
              {entry.project_id && (
                <Link
                  href={`/remontti/${entry.project_id}`}
                  className="text-sm font-medium text-sky-800 hover:underline"
                >
                  Avaa urakka
                </Link>
              )}
              {entry.source === "manual" && !entry.project_id && (
                <ManualEntryDelete
                  entryId={entry.id}
                  propertyId={propertyId}
                />
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
