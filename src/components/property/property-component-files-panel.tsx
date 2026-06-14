"use client";

import { useActionState } from "react";
import {
  deletePropertyComponentFile,
  uploadPropertyComponentFiles,
  type PropertyComponentFileActionState,
} from "@/app/actions/property-component-files";
import { brand, formInputClass } from "@/lib/brand-theme";
import {
  formatComponentFileSize,
  PROPERTY_COMPONENT_FILE_KIND_LABELS,
  PROPERTY_COMPONENT_FILE_KINDS,
  type PropertyComponentFileView,
} from "@/lib/property-component-files";

const labelClass = "block text-sm font-medium text-stone-800";

export function PropertyComponentFilesPanel({
  propertyId,
  componentId,
  files,
}: {
  propertyId: string;
  componentId: string;
  files: PropertyComponentFileView[];
}) {
  const [uploadState, uploadAction, uploadPending] = useActionState<
    PropertyComponentFileActionState,
    FormData
  >(uploadPropertyComponentFiles, {});

  const [deleteState, deleteAction, deletePending] = useActionState<
    PropertyComponentFileActionState,
    FormData
  >(deletePropertyComponentFile, {});

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50/80 p-3 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Liitteet
      </p>

      {files.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-col gap-2 rounded-lg bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-900">
                  {file.label || file.original_name || "Tiedosto"}
                </p>
                <p className="text-xs text-stone-500">
                  {PROPERTY_COMPONENT_FILE_KIND_LABELS[file.kind]}
                  {formatComponentFileSize(file.file_size_bytes) &&
                    ` · ${formatComponentFileSize(file.file_size_bytes)}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-sky-800 hover:underline"
                >
                  Avaa
                </a>
                <form action={deleteAction}>
                  <input type="hidden" name="property_id" value={propertyId} />
                  <input type="hidden" name="file_id" value={file.id} />
                  <button
                    type="submit"
                    disabled={deletePending}
                    onClick={(e) => {
                      if (!confirm("Poistetaanko tiedosto?")) e.preventDefault();
                    }}
                    className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
                  >
                    Poista
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-stone-600">
          Ei liitteitä. Lisää esim. kattoremontin kuitti tai takuutodistus.
        </p>
      )}

      <form action={uploadAction} className="mt-4 space-y-3 border-t border-stone-200 pt-4">
        <input type="hidden" name="property_id" value={propertyId} />
        <input type="hidden" name="component_id" value={componentId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`cfile-kind-${componentId}`} className={labelClass}>
              Tiedoston tyyppi
            </label>
            <select
              id={`cfile-kind-${componentId}`}
              name="file_kind"
              defaultValue="kuitti"
              className={formInputClass}
            >
              {PROPERTY_COMPONENT_FILE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {PROPERTY_COMPONENT_FILE_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`cfile-label-${componentId}`} className={labelClass}>
              Kuvaus (valinnainen)
            </label>
            <input
              id={`cfile-label-${componentId}`}
              name="file_label"
              type="text"
              placeholder="Esim. Kattoremontti 2022"
              className={formInputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor={`cfile-input-${componentId}`} className={labelClass}>
            Tiedosto (PDF tai kuva, max 10 Mt)
          </label>
          <input
            id={`cfile-input-${componentId}`}
            name="component_files"
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
          className={`${brand.btnSecondary} text-sm disabled:opacity-60`}
        >
          {uploadPending ? "Ladataan…" : "Lisää tiedosto"}
        </button>
      </form>
    </div>
  );
}
