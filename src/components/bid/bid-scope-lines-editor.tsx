"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  findScopeLineIndexByItemId,
  findScopeLineIndexByLabel,
  newScopeLineId,
  scopeLineFilled,
  type BidScopeLine,
} from "@/lib/bid-scope-lines";

export type BidScopeLinesEditorHandle = {
  addLine: (label: string, itemId?: string) => string | null;
  focusLine: (label: string, itemId?: string) => boolean;
};

type BidScopeLinesEditorProps = {
  lines: BidScopeLine[];
  onChange: (lines: BidScopeLine[]) => void;
  inputClass: string;
  sectionLabel: string;
};

const SCOPE_HINTS: Record<string, string> = {
  installation: "Mitä asennukseen kuuluu ja mitä ei?",
  materials: "Materiaalit, tarvikkeet ja laitevalinnat.",
  scope: "Kuvaa selkeästi mitä hinta sisältää ja mitä ei.",
  timeline: "Arvioitu kesto ja aloitusaika.",
  warranty: "Työn takuu vuosina ja ehdoissa.",
  terms: "Maksuehdot ja sopimusehdot.",
  removal: "Purku, jätehuolto ja siivous.",
  insulation: "Eristetyypit, paksuudet ja laajuus.",
  gutters: "Rännit, kourut ja sadevesijärjestelmä.",
  safety: "Työturva, telineet ja suojaukset.",
  diagnosis: "Kartoitus, mittaus ja arviointi ennen työtä.",
  testing: "Testaus, säätö ja käyttöönotto.",
  refrigerant: "Putkisto, tyhjiötyö ja kylmäaine.",
  electrical: "Sähkötyöt, kaapelointi ja kytkentä.",
  condensate: "Kondenssiveden poisto ja läpiviennit.",
  mounting: "Telineet, kiinnitykset ja läpiviennit.",
  documentation: "Dokumentointi, ohjeet ja opastus.",
};

function hintForLabel(label: string): string {
  const norm = label.trim().toLowerCase();
  for (const [key, hint] of Object.entries(SCOPE_HINTS)) {
    if (norm.includes(key) || norm.includes(hint.slice(0, 8).toLowerCase())) {
      return hint;
    }
  }
  return "Kuvaa lyhyesti mitä hinta sisältää tässä kohdassa.";
}

export const BidScopeLinesEditor = forwardRef(function BidScopeLinesEditor(
  { lines, onChange, inputClass, sectionLabel }: BidScopeLinesEditorProps,
  ref: Ref<BidScopeLinesEditorHandle>,
) {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [focusLineId, setFocusLineId] = useState<string | null>(null);

  const progress = useMemo(() => {
    const total = lines.length;
    const done = lines.filter(scopeLineFilled).length;
    return { done, total };
  }, [lines]);

  useEffect(() => {
    if (!focusLineId) return;
    const el = inputRefs.current.get(focusLineId);
    el?.focus({ preventScroll: true });
    setFocusLineId(null);
  }, [focusLineId, lines]);

  function updateLine(id: string, patch: Partial<BidScopeLine>) {
    onChange(
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    onChange(lines.filter((line) => line.id !== id));
  }

  function findLineIndex(label: string, itemId?: string): number {
    if (itemId) {
      const byId = findScopeLineIndexByItemId(lines, itemId);
      if (byId >= 0) return byId;
    }
    return findScopeLineIndexByLabel(lines, label);
  }

  function addLine(label = "", itemId?: string): string {
    const trimmedLabel = label.trim();
    const existingIdx = findLineIndex(trimmedLabel, itemId);
    if (existingIdx >= 0) {
      const existing = lines[existingIdx]!;
      setFocusLineId(existing.id);
      return existing.id;
    }

    const id = newScopeLineId();
    onChange([
      ...lines,
      {
        id,
        label: trimmedLabel,
        value: "",
        itemId,
        seeded: false,
      },
    ]);
    setFocusLineId(id);
    return id;
  }

  function focusLineByLabel(label: string, itemId?: string): boolean {
    const idx = findLineIndex(label, itemId);
    if (idx < 0) return false;
    setFocusLineId(lines[idx]!.id);
    return true;
  }

  useImperativeHandle(ref, () => ({
    addLine(label: string, itemId?: string) {
      return addLine(label, itemId);
    },
    focusLine(label: string, itemId?: string) {
      return focusLineByLabel(label, itemId);
    },
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-stone-900">{sectionLabel}</p>
        {progress.total > 0 && (
          <span className="shrink-0 text-xs font-medium text-sky-800">
            {progress.done}/{progress.total} valmis
          </span>
        )}
      </div>

      <ol className="space-y-3">
        {lines.map((line, index) => {
          const done = scopeLineFilled(line);
          const started = line.value.trim().length > 0 && !done;

          return (
            <li
              key={line.id}
              className={`rounded-xl border px-3 py-3 ${
                done
                  ? "border-emerald-200 bg-emerald-50/50"
                  : started
                    ? "border-sky-200 bg-sky-50/60"
                    : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <label
                  htmlFor={`scope-line-${line.id}`}
                  className="text-sm font-medium text-stone-900"
                >
                  {done && <span className="mr-1 text-emerald-700">✓</span>}
                  {started && <span className="mr-1 text-sky-700">…</span>}
                  {line.label.trim() || `Lisäkohta ${index + 1}`}
                </label>
                {!line.seeded && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="shrink-0 text-xs text-stone-500 hover:text-red-700"
                    aria-label={`Poista ${line.label || `kohta ${index + 1}`}`}
                  >
                    Poista
                  </button>
                )}
              </div>
              {line.label.trim() && (
                <p className="mt-1 text-xs text-stone-600">
                  {hintForLabel(line.label)}
                </p>
              )}
              <input
                id={`scope-line-${line.id}`}
                type="text"
                value={line.value}
                onChange={(e) => updateLine(line.id, { value: e.target.value })}
                placeholder="Kirjoita tähän…"
                className={`${inputClass} mt-2`}
                ref={(el) => {
                  if (el) inputRefs.current.set(line.id, el);
                  else inputRefs.current.delete(line.id);
                }}
              />
            </li>
          );
        })}
      </ol>

      <details className="rounded-lg border border-stone-200 bg-white/80 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-stone-600">
          Lisää oma kohta (valinnainen)
        </summary>
        <button
          type="button"
          onClick={() => addLine()}
          className="mt-2 text-sm font-medium text-sky-800 hover:underline"
        >
          + Uusi rivi
        </button>
      </details>
    </div>
  );
});
