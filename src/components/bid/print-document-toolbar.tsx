"use client";

import Link from "next/link";

export function PrintDocumentToolbar({
  backHref,
  backLabel = "Takaisin",
}: {
  backHref: string;
  backLabel?: string;
}) {
  return (
    <div className="print:hidden mb-8 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-2xl bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-800"
      >
        Tulosta / tallenna PDF
      </button>
      <Link
        href={backHref}
        className="rounded-2xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
      >
        {backLabel}
      </Link>
    </div>
  );
}
