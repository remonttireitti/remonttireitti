"use client";

import Link from "next/link";
import { ContractorQuotePdfDownloadButton } from "@/components/contractor/contractor-quote-pdf-download";
import type { ContractorQuotePdfData } from "@/lib/contractor-quote-pdf";

export function ContractorQuotePrintToolbar({
  backHref,
  backLabel = "Takaisin",
  quoteId,
  pdfData,
  filename,
  recordExport = false,
}: {
  backHref: string;
  backLabel?: string;
  quoteId?: string;
  pdfData?: ContractorQuotePdfData;
  filename?: string;
  recordExport?: boolean;
}) {
  return (
    <div className="print:hidden mb-8 flex flex-wrap items-center gap-3">
      <ContractorQuotePdfDownloadButton
        quoteId={quoteId}
        pdfData={pdfData}
        filename={filename}
        recordExport={recordExport}
      />
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
