"use client";

import { useEffect, useRef, useState } from "react";
import { formInputClass } from "@/components/project/form-layout";

const MAX_FILES = 8;
const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  name?: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  /** Näytä painike ja lista (piilota muilla vaiheilla, tiedostosyöte säilyy). */
  showUi?: boolean;
  emptyLabel?: string;
  hint?: string;
};

export function ProjectPhotoUpload({
  name = "project_photos",
  files,
  onFilesChange,
  showUi = true,
  emptyLabel = "Lisää kuvia (asennuspaikka, seinät, ulkoyksikön paikka…)",
  hint = "Kuvat liitetään tarjouspyyntöön. Enintään 8 kuvaa, 5 Mt / kuva.",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;
  }, [files]);

  function addFiles(incoming: FileList | null) {
    if (!incoming?.length) return;
    setError(null);
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (!file.type.startsWith("image/")) {
        setError("Vain kuvatiedostot (jpg, png, webp…) ovat sallittuja.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`Kuva ${file.name} on liian suuri (max 5 Mt).`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setError(`Enintään ${MAX_FILES} kuvaa.`);
        break;
      }
      next.push(file);
    }
    onFilesChange(next);
  }

  function removeAt(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
    setError(null);
  }

  return (
    <div
      className={
        showUi ? "space-y-3" : "sr-only h-0 overflow-hidden"
      }
      aria-hidden={!showUi}
    >
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple
        tabIndex={showUi ? undefined : -1}
        className="sr-only"
        onChange={(e) => addFiles(e.target.files)}
      />
      {showUi && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`${formInputClass} w-full border-dashed text-left text-sm text-stone-600`}
          >
            {files.length === 0
              ? emptyLabel
              : `Lisää kuvia (${files.length}/${MAX_FILES})`}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {files.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50/60 px-3 py-2 text-sm"
                >
                  <span className="truncate text-stone-700">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                  >
                    Poista
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-stone-500">{hint}</p>
        </>
      )}
    </div>
  );
}
