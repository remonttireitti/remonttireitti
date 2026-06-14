"use client";

import { useActionState } from "react";
import {
  deletePropertyArchiveDocument,
  uploadPropertyArchiveDocuments,
  type PropertyArchiveDocumentActionState,
} from "@/app/actions/property-archive-documents";
import { brand, formInputClass } from "@/lib/brand-theme";
import {
  formatArchiveDocumentSize,
  PROPERTY_ARCHIVE_DOCUMENT_KIND_LABELS,
  PROPERTY_ARCHIVE_DOCUMENT_KINDS,
  type PropertyArchiveDocumentView,
} from "@/lib/property-archive-documents";

const labelClass = "block text-sm font-medium text-stone-800";

function formatDocumentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PropertyArchiveDocumentsSection({
  propertyId,
  documents,
}: {
  propertyId: string;
  documents: PropertyArchiveDocumentView[];
}) {
  const [uploadState, uploadAction, uploadPending] = useActionState<
    PropertyArchiveDocumentActionState,
    FormData
  >(uploadPropertyArchiveDocuments, {});

  const [deleteState, deleteAction, deletePending] = useActionState<
    PropertyArchiveDocumentActionState,
    FormData
  >(deletePropertyArchiveDocument, {});

  return (
    <section className="mt-8">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Kiinteistön asiakirjat</h2>
        <p className="mt-1 text-sm text-stone-600">
          Kiinteistökirja, rakennussuunnitelmat, energiatodistus ja muut tärkeät
          paperit yhdessä paikassa.
        </p>
      </div>

      {documents.length > 0 ? (
        <ul className={`${brand.section} mt-3 divide-y divide-stone-100`}>
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-stone-900">
                  {doc.label || doc.original_name || "Asiakirja"}
                </p>
                <p className="mt-0.5 text-sm text-stone-500">
                  {PROPERTY_ARCHIVE_DOCUMENT_KIND_LABELS[doc.kind]}
                  {formatArchiveDocumentSize(doc.file_size_bytes) &&
                    ` · ${formatArchiveDocumentSize(doc.file_size_bytes)}`}
                  {` · ${formatDocumentDate(doc.created_at)}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-stone-50"
                >
                  Avaa
                </a>
                <form action={deleteAction}>
                  <input type="hidden" name="property_id" value={propertyId} />
                  <input type="hidden" name="document_id" value={doc.id} />
                  <button
                    type="submit"
                    disabled={deletePending}
                    onClick={(e) => {
                      if (!confirm("Poistetaanko asiakirja?")) e.preventDefault();
                    }}
                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Poista
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${brand.section} mt-3 px-5 py-8 text-sm text-stone-600`}>
          Ei vielä asiakirjoja. Lisää esimerkiksi kiinteistökirja tai
          rakennussuunnitelmat.
        </p>
      )}

      <div className={`${brand.section} mt-4 p-5 sm:p-6`}>
        <h3 className="text-sm font-semibold text-stone-900">Lisää asiakirja</h3>
        <form action={uploadAction} className="mt-4 space-y-3">
          <input type="hidden" name="property_id" value={propertyId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="archive-doc-kind" className={labelClass}>
                Asiakirjan tyyppi
              </label>
              <select
                id="archive-doc-kind"
                name="document_kind"
                defaultValue="kiinteistokirja"
                className={formInputClass}
              >
                {PROPERTY_ARCHIVE_DOCUMENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {PROPERTY_ARCHIVE_DOCUMENT_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="archive-doc-label" className={labelClass}>
                Kuvaus (valinnainen)
              </label>
              <input
                id="archive-doc-label"
                name="document_label"
                type="text"
                placeholder="Esim. Alkuperäinen rakennuslupa 1985"
                className={formInputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="archive-doc-input" className={labelClass}>
              Tiedosto (PDF tai kuva, max 10 Mt)
            </label>
            <input
              id="archive-doc-input"
              name="archive_documents"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              className="mt-1 block w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-sky-900"
            />
          </div>

          {uploadState.error && (
            <p className="text-sm text-red-600" role="alert">
              {uploadState.error}
            </p>
          )}
          {uploadState.ok && (
            <p className="text-sm text-emerald-700" role="status">
              {uploadState.ok}
            </p>
          )}
          {deleteState.error && (
            <p className="text-sm text-red-600" role="alert">
              {deleteState.error}
            </p>
          )}

          <button
            type="submit"
            disabled={uploadPending}
            className={`${brand.btnPrimary} disabled:opacity-60`}
          >
            {uploadPending ? "Ladataan…" : "Tallenna asiakirja"}
          </button>
        </form>
      </div>
    </section>
  );
}
