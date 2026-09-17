"use client";

import Link from "next/link";

export function PrintDocumentToolbar({
  backHref,
  backLabel = "Takaisin",
  projectId,
}: {
  backHref: string;
  backLabel?: string;
  projectId: string;
}) {
  const pdfHref = `/api/projects/${projectId}/contract-pdf`;

  return (
    <div className="print:hidden mb-8 flex flex-wrap items-center gap-3">
      <a
        href={pdfHref}
        className="rounded-2xl bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-800"
      >
        Lataa PDF
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-2xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
      >
        Tulosta
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
