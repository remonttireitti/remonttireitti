"use client";

import { pdf } from "@react-pdf/renderer";
import { useCallback, useEffect, useState } from "react";
import { ContractorQuotePdfDocument } from "@/lib/contractor-quote-pdf-document";
import type { ContractorQuotePdfData } from "@/lib/contractor-quote-pdf";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function renderQuotePdfBlob(data: ContractorQuotePdfData): Promise<Blob> {
  return pdf(<ContractorQuotePdfDocument data={data} />).toBlob();
}

type DownloadPayload = {
  pdfData: ContractorQuotePdfData;
  filename: string;
  recordExport: boolean;
};

async function fetchQuotePdfPayload(quoteId: string): Promise<DownloadPayload> {
  const response = await fetch(`/api/contractor-quotes/${quoteId}/pdf-data`);
  const body = (await response.json()) as {
    error?: string;
    pdfData?: ContractorQuotePdfData;
    filename?: string;
    recordExport?: boolean;
  };

  if (!response.ok || !body.pdfData || !body.filename) {
    throw new Error(body.error ?? "PDF-tiedon haku epäonnistui");
  }

  return {
    pdfData: body.pdfData,
    filename: body.filename,
    recordExport: Boolean(body.recordExport),
  };
}

async function recordQuotePdfExport(quoteId: string): Promise<void> {
  const response = await fetch(`/api/contractor-quotes/${quoteId}/pdf-export`, {
    method: "POST",
  });

  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? "PDF-viennin kirjaus epäonnistui");
  }
}

export async function downloadContractorQuotePdf(options: {
  quoteId?: string;
  pdfData?: ContractorQuotePdfData;
  filename?: string;
  recordExport?: boolean;
}): Promise<void> {
  let pdfData = options.pdfData;
  let filename = options.filename;
  let recordExport = options.recordExport ?? false;

  if (options.quoteId) {
    const payload = await fetchQuotePdfPayload(options.quoteId);
    pdfData = payload.pdfData;
    filename = payload.filename;
    recordExport = payload.recordExport;
  }

  if (!pdfData || !filename) {
    throw new Error("PDF-tiedot puuttuvat");
  }

  const blob = await renderQuotePdfBlob(pdfData);
  downloadBlob(blob, filename);

  if (recordExport && options.quoteId) {
    await recordQuotePdfExport(options.quoteId);
  }
}

const defaultButtonClass =
  "rounded-2xl bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60";

export function ContractorQuotePdfDownloadButton({
  quoteId,
  pdfData,
  filename,
  recordExport = false,
  className = defaultButtonClass,
  children = "Lataa PDF",
  onComplete,
}: {
  quoteId?: string;
  pdfData?: ContractorQuotePdfData;
  filename?: string;
  recordExport?: boolean;
  className?: string;
  children?: React.ReactNode;
  onComplete?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      await downloadContractorQuotePdf({
        quoteId,
        pdfData,
        filename,
        recordExport,
      });
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF-generointi epäonnistui");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className={className}
      >
        {loading ? "Luodaan PDF..." : children}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

export function ContractorQuotePdfAutoDownload({
  quoteId,
  backHref = "/tarjouslaskuri",
}: {
  quoteId: string;
  backHref?: string;
}) {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState("Luodaan PDF-tarjousta...");

  const runDownload = useCallback(async () => {
    setStatus("loading");
    setMessage("Luodaan PDF-tarjousta...");
    try {
      await downloadContractorQuotePdf({ quoteId });
      setStatus("done");
      setMessage("PDF ladattu. Voit ladata saman tarjouksen uudelleen milloin tahansa — se ei kuluta kuukausirajaa.");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "PDF-generointi epäonnistui",
      );
    }
  }, [quoteId]);

  useEffect(() => {
    void runDownload();
  }, [runDownload]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm text-stone-600">{message}</p>
      {status !== "loading" && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void runDownload()}
            className={defaultButtonClass}
          >
            {status === "error" ? "Yritä uudelleen" : "Lataa uudelleen"}
          </button>
          <a
            href={backHref}
            className="rounded-2xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Takaisin
          </a>
        </div>
      )}
    </div>
  );
}
