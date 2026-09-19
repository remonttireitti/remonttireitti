"use client";

import { useCallback, useEffect, useState } from "react";
import type { AcceptedBidDocumentData } from "@/lib/accepted-bid-document";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type DownloadPayload = {
  document: AcceptedBidDocumentData;
  filename: string;
};

async function fetchContractPdfPayload(
  projectId: string,
): Promise<DownloadPayload> {
  const response = await fetch(`/api/projects/${projectId}/contract-pdf-data`);
  const body = (await response.json()) as {
    error?: string;
    document?: AcceptedBidDocumentData;
    filename?: string;
  };

  if (!response.ok || !body.document || !body.filename) {
    throw new Error(body.error ?? "PDF-tiedon haku epäonnistui");
  }

  return { document: body.document, filename: body.filename };
}

async function renderContractPdfBlob(
  data: AcceptedBidDocumentData,
): Promise<Blob> {
  // Dynamic import keeps @react-pdf out of the Worker SSR/cold-start path.
  const [{ pdf }, { AcceptedBidPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/accepted-bid-pdf"),
  ]);
  return pdf(<AcceptedBidPdfDocument data={data} />).toBlob();
}

export async function downloadAcceptedBidPdf(projectId: string): Promise<void> {
  const { document, filename } = await fetchContractPdfPayload(projectId);
  const blob = await renderContractPdfBlob(document);
  downloadBlob(blob, filename);
}

const defaultButtonClass =
  "rounded-2xl bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60";

export function AcceptedBidPdfDownloadButton({
  projectId,
  className = defaultButtonClass,
  children = "Lataa PDF",
}: {
  projectId: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      await downloadAcceptedBidPdf(projectId);
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
        onClick={() => void handleDownload()}
        disabled={loading}
        className={className}
      >
        {loading ? "Luodaan PDF..." : children}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

export function AcceptedBidPdfAutoDownload({
  projectId,
  backHref,
}: {
  projectId: string;
  backHref: string;
}) {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState("Luodaan sopimus-PDF:ää...");

  const runDownload = useCallback(async () => {
    setStatus("loading");
    setMessage("Luodaan sopimus-PDF:ää...");
    try {
      await downloadAcceptedBidPdf(projectId);
      setStatus("done");
      setMessage("PDF ladattu. Voit sulkea tämän sivun tai ladata uudelleen.");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "PDF-generointi epäonnistui",
      );
    }
  }, [projectId]);

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
