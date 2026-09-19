"use client";

import Link from "next/link";
import { AcceptedBidPdfDownloadButton } from "@/components/bid/accepted-bid-pdf-download";

export function PrintDocumentToolbar({
  backHref,
  backLabel = "Takaisin",
  projectId,
}: {
  backHref: string;
  backLabel?: string;
  projectId: string;
}) {
  return (
    <div className="print:hidden mb-8 flex flex-wrap items-center gap-3">
      <AcceptedBidPdfDownloadButton projectId={projectId} />
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
